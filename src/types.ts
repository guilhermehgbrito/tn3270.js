import type {
  TelnetProtocolOptions,
  TN3270DataTypes,
  TN3270FieldColors,
  TN3270FieldHighlighting,
  TN3270ResponseFlags,
  TN3270TelnetOptions,
} from './common/enums';

export type CodePage = '0037';

export type OutputEncoding = 'ascii';

export type CodePageOutputEncoding = `${CodePage}-${OutputEncoding}`;

export type TerminalScheme = '3278' | '3279';

export type TerminalModel = '2' | '3' | '4' | '5';

export type ExtendedTerminalModel = `${TerminalModel}-E`;

type AllTerminalModels = TerminalModel | ExtendedTerminalModel;

export type DeviceType = `IBM-${TerminalScheme}-${AllTerminalModels}`;

export type TerminalScreenSize = { rows: number; columns: number };

export type EncodedAddress = [number, number];

export interface Logger {
  debug(message: any, ...args: any[]): void;
  log(message: any, ...args: any[]): void;
  warn(message: any, ...args: any[]): void;
  error(message: any, ...args: any[]): void;
}

export interface TN3270Options {
  host: string;
  port?: number;
  deviceType?: DeviceType;
  deviceName?: string;
  codePage?: CodePageOutputEncoding;
  logger?: Logger;
  lockTimeout?: number;
}

export interface TN3270ScreenOptions {
  model: TerminalModel;
  codePageTranslator: CodePageTranslator;
  logger?: Logger;
}

export interface TN3270Screen {
  screenSize: number;
  bufferAddress: number;
  cursorAddress: number;
  addToAddress(amount: number, address: number): number;
  subtractFromAddress(amount: number, address: number): number;
  addField(field: TN3270Field): void;
  distanceInBytes(addressStart: number, addressEnd: number): number;
  removeField(field: TN3270Field): void;
  getFields(): TN3270Field[];
  toString(): string;
  findField(address: number): TN3270Field | undefined;
  findText(text: string): TN3270Field | undefined;
  decodeAddress(data: EncodedAddress): number;
  encodeAddress(address: number): EncodedAddress;
  addressToRowColumn(address: number): { row: number; column: number };
  setBufferAddress(address: number): void;
  setCursorAddress(address: number): void;
  writeString(text: string): void;
}

export type AllOptions = TelnetProtocolOptions | TN3270TelnetOptions;

export interface Node {
  readonly data: number[];
  appendData(...data: number[]): void;
}

export interface Executor<T> {
  execute(dependency: T): void;
}

export type FieldExecutor = Executor<TN3270Screen>;

export interface TN3270FieldOptions {
  highlight?: TN3270FieldHighlighting;
  color?: TN3270FieldColors;
  protected?: boolean;
  modified?: boolean;
  numeric?: boolean;
  data?: number[];
  addressStart?: number;
  addressEnd?: number;
}

export interface CodePageTranslator {
  toEBCDIC(text: string): number[];
  fromEBCDIC(data: number[]): string;
}

export interface TN3270Field {
  data: number[];
  addressStart: number;
  addressEnd: number;
  isNumeric(): boolean;
  isProtected(): boolean;
  isModified(): boolean;
  skip(): boolean;
  appendData(...data: number[]): void;
  updateData(data: number[], offset?: number): void;
}

export type TN3270OrderNode = Node & FieldExecutor;

export type TN3270StructuredFieldNode<T> = Node & Executor<T>;

export type Type<T> = new (...args: any[]) => T;

export type TN3270MessageHeader = {
  dataType: TN3270DataTypes;
  responseFlag: TN3270ResponseFlags;
  sequenceNumber: number;
};

export type Registry<I extends number | string, T> = Record<I, T>;

export type OrderNodeClassRegistry = Registry<number, Type<TN3270OrderNode>>;

export type CodePageTranslatorRegistry = Registry<
  CodePageOutputEncoding,
  CodePageTranslator
>;

export type TN3270Events =
  | 'socket-connect'
  | 'socket-close'
  | 'socket-error'
  | 'screen-update'
  | 'data'
  | 'close'
  | 'error'
  | 'connect'
  | 'keyboard-lock'
  | 'keyboard-unlock';
