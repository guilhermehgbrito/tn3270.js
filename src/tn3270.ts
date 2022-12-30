import type {
  AllOptions,
  Logger,
  TN3270Options,
  TN3270OrderNode,
  DeviceType,
  TerminalModel,
  Type,
  CodePageTranslator,
  CodePageOutputEncoding,
  CodePageTranslatorRegistry,
  OrderNodeClassRegistry,
} from './types';
import { Lock } from './lock';
import {
  SetBufferAddressNode,
  StartFieldNode,
  InsertCursorNode,
} from './nodes';
import { Socket } from 'net';
import { InvalidOptionError } from './errors';
import { TN3270Screen } from './tn3270-screen';
import {
  States,
  TelnetProtocolCommands,
  TelnetProtocolOptions,
  TN3270Operations,
  TN3270Orders,
  TN3270OutboundStructuredFields,
  TN3270ReasonCodesText,
  TN3270TelnetCommands,
  TN3270TelnetOptions,
} from './common/enums';
import { AsciiEbcdicCP37Translator } from './translate/ascii-ebcdic-cp-37.translator';
import { TN3270Message } from './tn3270-message';
export class TN3270 {
  readonly host: string;
  readonly port: number;
  readonly deviceType: DeviceType = 'IBM-3278-2-E';
  readonly screen: TN3270Screen;
  private currentState: States = States.DISCONNECTED;
  private socket: Socket;
  private _deviceName = '';
  private hostOptions: Record<AllOptions, boolean>;
  private receivedBuffer: Buffer;
  private outputBuffer: Buffer;
  private keyboardLocked = false;
  private logger: Logger;
  private lock: Lock;
  private sequenceNumber = 0;
  private messageQueue: TN3270Message[] = [];
  private codePageTranslatorRegistry: CodePageTranslatorRegistry = {
    '0037-ascii': new AsciiEbcdicCP37Translator(),
  };
  private orderNodeClassRegistry: OrderNodeClassRegistry = {};

  constructor({
    host,
    codePage,
    deviceType,
    port = 23,
    logger = console,
    lockTimeout = 30000,
  }: TN3270Options) {
    if (!host) throw new InvalidOptionError('host', host);
    if (!this.isValidDeviceType(deviceType))
      throw new InvalidOptionError('deviceType', deviceType);

    this.lock = new Lock(lockTimeout);

    this.host = host;
    this.port = port;
    this.logger = logger;
    this.deviceType = deviceType ?? this.deviceType;

    this.socket = new Socket();

    const model = this.deviceType.split('-')[2] as TerminalModel;

    const codePageTranslator = this.codePageTranslatorRegistry[codePage];

    if (!codePageTranslator) throw new InvalidOptionError('codePage', codePage);

    this.screen = new TN3270Screen({
      model,
      logger,
      codePageTranslator,
    });

    this.registerDefaultOrderNodeClasses();
    this.setSocketListeners();
    this.resetHostOptions();
  }

  public get isConnected() {
    return this.currentState !== States.DISCONNECTED;
  }

  public get isTN3270E() {
    return this.hostOptions[TN3270TelnetOptions.TN3270E];
  }

  public get deviceName() {
    return this._deviceName;
  }

  public get isKeyboardLocked() {
    return this.keyboardLocked;
  }

  public registerOrderNodeClass(
    order: TN3270Orders,
    orderNodeClass: Type<TN3270OrderNode>
  ) {
    this.orderNodeClassRegistry[order] = orderNodeClass;
  }

  public registerCodePageTranslator(
    codePageOutputEncoding: CodePageOutputEncoding,
    codePageTranslator: CodePageTranslator
  ) {
    this.codePageTranslatorRegistry[codePageOutputEncoding] =
      codePageTranslator;
  }

  public processMessageQueue(): void {
    const completedMessages = this.messageQueue.filter((message) =>
      message.isComplete()
    );
    this.logger.debug(`Processing message queue: ${completedMessages.length}`);

    if (completedMessages.length === 0) return;

    let message: TN3270Message | undefined;

    while ((message = completedMessages.shift())) {
      if (this.isTN3270E) message.parseHeader();

      this.logger.debug(`Processing message:`, message.toJSON());

      const operation = message.data.shift();

      switch (operation) {
        case TN3270Operations.WSF_SNA:
        case TN3270Operations.WSF: {
          this.processWriteStructuredField(message.data);
          break;
        }
        case TN3270Operations.W:
        case TN3270Operations.W_SNA: {
          this.applyWCC(message.data.shift() as number);

          this.processWrite(message.data);
          break;
        }
        case TN3270Operations.EW:
        case TN3270Operations.EW_SNA: {
          this.applyWCC(message.data.shift() as number);

          this.processEraseWrite(message.data);
          break;
        }
        default:
          this.logger.error(`Unhandled operation: ${operation}`);
          this.disconnect();
      }

      this.messageQueue.splice(
        this.messageQueue.findIndex((m) => m.id === message.id),
        1
      );
    }
  }

  public deviceTypeInBytes(): number[] {
    return this.deviceType.split('').map((v) => v.charCodeAt(0));
  }

  public resetHostOptions(): void {
    const telnetOptions = Object.values(TelnetProtocolOptions);
    const tn3270Options = Object.values(TN3270TelnetOptions);

    if (this.isConnected) {
      const acceptedOptions = Object.entries(this.hostOptions)
        .filter(([, v]) => v)
        .map(([k, v]) => [parseInt(k, 10), v] as [number, boolean]);

      const revokeOptions = (option: number) =>
        this.writeRaw(
          Buffer.from([
            TelnetProtocolCommands.IAC,
            TelnetProtocolCommands.WONT,
            option,
            TelnetProtocolCommands.IAC,
            TelnetProtocolCommands.DONT,
            option,
          ])
        );

      for (const [option] of acceptedOptions) revokeOptions(option);
    }

    this.hostOptions = [...telnetOptions, ...tn3270Options].reduce((acc, v) => {
      acc[v] = false;
      return acc;
    }, {} as any);
  }

  public reset(): void {
    this.currentState = States.DISCONNECTED;
    this.socket.destroy();

    this.socket = new Socket();
    this.setSocketListeners();
    this.resetHostOptions();
  }

  public isValidDeviceType(deviceType: string): deviceType is DeviceType {
    const VALID_DEVICE_TYPES = [
      'IBM-3278-2',
      'IBM-3278-2-E',
      'IBM-3278-3',
      'IBM-3278-3-E',
      'IBM-3278-4',
      'IBM-3278-4-E',
      'IBM-3278-5',
      'IBM-3278-5-E',
    ];

    return VALID_DEVICE_TYPES.includes(deviceType);
  }

  public connect(): void {
    this.socket.connect(this.port, this.host);
  }

  public disconnect(): void {
    this.currentState = States.DISCONNECTED;
    this.socket.destroy();
  }

  public writeRaw(data: Buffer): void {
    this.socket.write(data);
  }

  public writeTN3270(data: Buffer): void {
    const HEADER = this.isTN3270E
      ? Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00])
      : Buffer.alloc(0);
    const IAC_EOR = Buffer.from([
      TelnetProtocolCommands.IAC,
      TN3270TelnetCommands.EOR,
    ]);

    this.outputBuffer = Buffer.concat([HEADER, data, IAC_EOR]);

    this.writeRaw(this.outputBuffer);
  }

  public toJSON(): any {
    return {
      deviceType: this.deviceType,
      deviceName: this._deviceName,
      model: this.screen.model,
      rows: this.screen.rows,
      columns: this.screen.columns,
      cursor: this.screen.addressToRowColumn(this.screen.cursorAddress),
    };
  }

  private registerDefaultOrderNodeClasses() {
    this.registerOrderNodeClass(TN3270Orders.SF, StartFieldNode);
    this.registerOrderNodeClass(TN3270Orders.SBA, SetBufferAddressNode);
    this.registerOrderNodeClass(TN3270Orders.IC, InsertCursorNode);
  }

  private increaseSequenceNumber() {
    this.sequenceNumber = (this.sequenceNumber + 1) % 65536;
  }

  private setState(state: States) {
    this.logger.debug(`State changed from ${this.currentState} to ${state}`);
    this.currentState = state;
  }

  private setSocketListeners() {
    this.socket.on('connect', this.handleSocketConnect.bind(this));
    this.socket.on('data', this.handleSocketData.bind(this));
    this.socket.on('error', this.handleSocketError.bind(this));
    this.socket.on('close', this.handleSocketClose.bind(this));
  }

  private handleSocketConnect() {
    this.currentState = States.CONNECTED;
  }

  private handleSocketData(data: Buffer): void {
    this.receivedBuffer = Buffer.from(data);

    this.lock.acquireAsync().then(() => {
      const isData = States.ST_DS_TN3270_DATA === this.currentState;

      if (isData) this.processDataStream(this.receivedBuffer);
      else this.processPacket(this.receivedBuffer);
    });
  }

  private processPacket(data: Buffer): Promise<void> {
    this.logger.debug('Received packet');

    let offset = 0;
    for (const byte of data) {
      switch (this.currentState) {
        case States.CONNECTED: {
          const byteHandlers = {
            [TelnetProtocolCommands.IAC]: () => this.setState(States.ST_IAC),
          };
          this.handle(byteHandlers, byte);
          break;
        }
        case States.ST_IAC: {
          const iacHandlers = {
            [TelnetProtocolCommands.WILL]: () => this.setState(States.ST_WILL),
            [TelnetProtocolCommands.WONT]: () => this.setState(States.ST_WONT),
            [TelnetProtocolCommands.DO]: () => this.setState(States.ST_DO),
            [TelnetProtocolCommands.DONT]: () => this.setState(States.ST_DONT),
            [TelnetProtocolCommands.SB]: () => this.setState(States.ST_SB),
            [TelnetProtocolCommands.SE]: () => this.setState(States.CONNECTED),
          };
          this.handle(iacHandlers, byte);
          break;
        }
        case States.ST_WILL: {
          this.writeRaw(
            Buffer.from([
              TelnetProtocolCommands.IAC,
              TelnetProtocolCommands.DO,
              byte,
            ])
          );

          this.setOptionStatus(byte, true);

          this.setState(States.CONNECTED);
          break;
        }
        case States.ST_WONT: {
          this.writeRaw(
            Buffer.from([
              TelnetProtocolCommands.IAC,
              TelnetProtocolCommands.DONT,
              byte,
            ])
          );

          this.setOptionStatus(byte, false);

          this.setState(States.CONNECTED);
          break;
        }
        case States.ST_DO: {
          this.writeRaw(
            Buffer.from([
              TelnetProtocolCommands.IAC,
              TelnetProtocolCommands.WILL,
              byte,
            ])
          );

          this.setOptionStatus(byte, true);

          if (byte === TelnetProtocolOptions.BINARY)
            this.setState(States.NEGOTIATED);
          else this.setState(States.CONNECTED);
          break;
        }
        case States.ST_DONT: {
          this.writeRaw(
            Buffer.from([
              TelnetProtocolCommands.IAC,
              TelnetProtocolCommands.WONT,
              byte,
            ])
          );

          this.setOptionStatus(byte, false);

          this.setState(States.CONNECTED);
          break;
        }
        case States.ST_SB: {
          const sbHandlers = {
            [TN3270TelnetOptions.TN3270E]: () =>
              this.setState(States.ST_SB_TN3270E),
            [TelnetProtocolOptions.TERMINAL_TYPE]: () =>
              this.setState(States.ST_SB_TERMINAL_TYPE),
          };
          this.handle(sbHandlers, byte);
          break;
        }
        case States.ST_SB_TN3270E: {
          const tn3270eHandlers = {
            [TN3270TelnetCommands.SEND]: () =>
              this.setState(States.ST_SB_TN3270E_SEND),
            [TN3270TelnetCommands.DEVICE_TYPE]: () =>
              this.setState(States.ST_SB_TN3270E_DEVICE_TYPE),
            [TN3270TelnetCommands.FUNCTIONS]: () =>
              this.setState(States.ST_SB_TN3270E_FUNCTIONS),
          };
          this.handle(tn3270eHandlers, byte);
          break;
        }
        case States.ST_SB_TN3270E_SEND: {
          const tn3270eSendHandlers = {
            [TN3270TelnetCommands.DEVICE_TYPE]: () =>
              this.setState(States.ST_SB_TN3270E_SEND_DEVICE_TYPE),
          };
          this.handle(tn3270eSendHandlers, byte);
          break;
        }
        case States.ST_SB_TN3270E_SEND_DEVICE_TYPE: {
          const sbHandlers = {
            [TelnetProtocolCommands.IAC]: () => this.setState(States.ST_IAC),
          };

          this.writeRaw(
            Buffer.from([
              TelnetProtocolCommands.IAC,
              TelnetProtocolCommands.SB,
              TN3270TelnetOptions.TN3270E,
              TN3270TelnetCommands.DEVICE_TYPE,
              TN3270TelnetCommands.REQUEST,
              ...this.deviceTypeInBytes(),
              TelnetProtocolCommands.IAC,
              TelnetProtocolCommands.SE,
            ])
          );

          this.handle(sbHandlers, byte);
          break;
        }
        case States.ST_SB_TN3270E_DEVICE_TYPE: {
          const sbHandlers = {
            [TN3270TelnetCommands.IS]: () =>
              this.setState(States.ST_SB_TN3270E_DEVICE_TYPE_IS),
            [TN3270TelnetCommands.REJECT]: () =>
              this.setState(States.ST_SB_TN3270E_DEVICE_TYPE_REJECT),
          };
          this.handle(sbHandlers, byte);
          break;
        }
        case States.ST_SB_TN3270E_DEVICE_TYPE_IS: {
          const sbHandlers = {
            [TN3270TelnetCommands.CONNECT]: () =>
              this.setState(States.ST_SB_CONNECT),
            [TelnetProtocolCommands.IAC]: () => this.setState(States.ST_IAC),
          };

          if (!(byte in sbHandlers)) break;

          this.handle(sbHandlers, byte);
          break;
        }
        case States.ST_SB_TN3270E_DEVICE_TYPE_REJECT: {
          const sbHandlers = {
            [TN3270TelnetCommands.REASON]: () =>
              this.setState(States.ST_SB_TN3270E_DEVICE_TYPE_REJECT_REASON),
          };
          this.handle(sbHandlers, byte);
          break;
        }
        case States.ST_SB_TN3270E_DEVICE_TYPE_REJECT_REASON: {
          this.logger.error(
            `Device type rejected: ${TN3270ReasonCodesText[byte]}`
          );
          this.setState(States.DISCONNECTED);
          return;
        }
        case States.ST_SB_CONNECT: {
          if (byte === TelnetProtocolCommands.IAC) {
            this.setState(States.ST_IAC);
            this.writeRaw(
              Buffer.from([
                TelnetProtocolCommands.IAC,
                TelnetProtocolCommands.SB,
                TN3270TelnetOptions.TN3270E,
                TN3270TelnetCommands.FUNCTIONS,
                TN3270TelnetCommands.REQUEST,
                TelnetProtocolCommands.IAC,
                TelnetProtocolCommands.SE,
              ])
            );
          } else this._deviceName += String.fromCharCode(byte);
          break;
        }
        case States.ST_SB_TN3270E_FUNCTIONS: {
          const sbHandlers = {
            [TN3270TelnetCommands.IS]: () =>
              this.setState(States.ST_SB_TN3270E_FUNCTIONS_IS),
          };
          this.handle(sbHandlers, byte);
          break;
        }
        case States.ST_SB_TN3270E_FUNCTIONS_IS: {
          if (byte === TelnetProtocolCommands.IAC)
            this.setState(States.NEGOTIATED);
          // this.functions.push(byte);
          else this.setState(States.ST_DS_TN3270_DATA);
          break;
        }
        case States.ST_SB_TERMINAL_TYPE: {
          const sbHandlers = {
            [TelnetProtocolCommands.SEND]: () =>
              this.setState(States.ST_SB_TERMINAL_TYPE_SEND),
          };
          this.handle(sbHandlers, byte);
          break;
        }
        case States.ST_SB_TERMINAL_TYPE_SEND: {
          const sbHandlers = {
            [TelnetProtocolCommands.IAC]: () => this.setState(States.ST_IAC),
          };

          this.writeRaw(
            Buffer.from([
              TelnetProtocolCommands.IAC,
              TelnetProtocolCommands.SB,
              TelnetProtocolOptions.TERMINAL_TYPE,
              TelnetProtocolCommands.IS,
              ...this.deviceTypeInBytes(),
              TelnetProtocolCommands.IAC,
              TelnetProtocolCommands.SE,
            ])
          );

          this.handle(sbHandlers, byte);
          break;
        }
        case States.NEGOTIATED: {
          this.setState(States.ST_DS_TN3270_DATA);
          break;
        }
        case States.ST_DS_TN3270_DATA: {
          return this.processDataStream(data.subarray(offset));
        }
        default:
          this.logger.error(`Unhandled state: ${this.currentState}`);
          this.disconnect();
          return;
      }
      offset++;
    }

    this.lock.release();
  }

  private setOptionStatus(option: AllOptions, status: boolean): void {
    this.hostOptions[option] = status;
  }

  private processDataStream(data: Buffer): Promise<void> {
    this.logger.debug(`Processing data stream`);

    let currentMessage = this.messageQueue[this.messageQueue.length - 1];

    if (!currentMessage || currentMessage.isComplete()) {
      currentMessage = new TN3270Message();
      this.messageQueue.push(currentMessage);
    }

    for (const byte of data) {
      switch (this.currentState) {
        case States.ST_IAC: {
          const iacHandlers = {
            [TelnetProtocolCommands.IAC]: () => {
              currentMessage.pushByte(byte);
              this.setState(States.ST_DS_TN3270_DATA);
            },
            [TN3270TelnetCommands.EOR]: () => {
              currentMessage.setAsComplete();
              currentMessage = new TN3270Message();
              this.messageQueue.push(currentMessage);
              this.setState(States.ST_DS_TN3270_DATA);
            },
          };
          this.handle(iacHandlers, byte);
          break;
        }
        case States.ST_DS_TN3270_DATA: {
          if (byte === TelnetProtocolCommands.IAC) {
            this.setState(States.ST_IAC);
            break;
          }
          currentMessage.pushByte(byte);
          break;
        }
        default:
          this.logger.error(`Unhandled state: ${this.currentState}`);
          this.disconnect();
          return;
      }
    }

    this.lock.release();
    this.processMessageQueue();
  }

  private applyWCC(wcc: number): void {
    const unlockKeyboard = (wcc & 2) === 2;

    if (unlockKeyboard) this.keyboardLocked = false;
  }

  private processWriteStructuredField(data: number[]): void {
    while (data.length > 0) {
      const LENGTH_BYTES = 2;
      const lengthInBytes = data.splice(0, LENGTH_BYTES);
      const length = (lengthInBytes[0] << 8) | lengthInBytes[1];

      const ID_BYTES = 1;
      const id = data.shift();

      switch (id) {
        case TN3270OutboundStructuredFields.READ_PARTITION: {
          const subOptionHandlers = {
            [TN3270OutboundStructuredFields.QUERY]: () => this.sendQueryReply(),
          };

          const [iac, subOption] = data.splice(
            0,
            length - LENGTH_BYTES - ID_BYTES
          );

          if (iac !== TelnetProtocolCommands.IAC) {
            this.logger.error('Invalid read partition suboption');
            this.setState(States.DISCONNECTED);
            return;
          }

          this.handle(subOptionHandlers, subOption);
          break;
        }
        default:
          this.logger.error(`Unhandled structured field: ${id}`);
          this.disconnect();
      }
    }
  }

  private processWrite(data: number[]): void {
    this.processTN3270Data(data);
  }

  private processEraseWrite(data: number[]): void {
    this.screen.eraseAll();
    this.processTN3270Data(data);
  }

  private processTN3270Data(data: number[]): void {
    const nodes: TN3270OrderNode[] = [];

    let node: TN3270OrderNode | undefined;

    for (const byte of data) {
      const NodeClass = this.orderNodeClassRegistry[byte];
      if (NodeClass) {
        nodes.push((node = new NodeClass()));
        continue;
      }
      node?.appendData(byte);
    }

    for (const node of nodes) node.execute(this.screen);
  }

  private handleSocketError(error: Error): void {
    console.log('error', error);
  }

  private handleSocketClose(): void {
    console.log('close');
    this.reset();
  }

  private handle(handlers: Record<number, () => void>, byte: number): void {
    const handler = handlers[byte];

    if (!handler) {
      this.logger.error(`Invalid negotiation, invalid command ${byte}`);
      return;
    }

    return handler.call(this);
  }

  private sendQueryReply(): void {
    this.writeTN3270(
      Buffer.from(
        `88000e81808081848586878895a1a60017818101000050001801000a0
    2e50002006f090c07800008818400078000001b81858200090c000000
    000700100002b900250110f103c3013600268186001000f4f1f1f2f2f
    3f3f4f4f5f5f6f6f7f7f8f8f9f9fafafbfbfcfcfdfdfefeffffffff00
    0f81870500f0f1f1f2f2f4f4f8f800078188000102000c81950000100
    010000101001281a1000000000000000006a3f3f2f7f0001181a6000
    00b01000050001800500018ffef`.replace(/\s/g, ''),
        'hex'
      )
    );
  }
}
