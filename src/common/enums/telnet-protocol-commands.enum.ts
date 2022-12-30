export enum TelnetProtocolCommands {
  /**
   * SE - End of subnegotiation parameters
   *
   * @description
   * The SE (end of subnegotiation parameters) is a data stream element that
   * indicates the end of the subnegotiation parameters.
   */
  SE = 240,

  /**
   * SB - Subnegotiation of the indicated option follows
   *
   * @description
   * The SB (subnegotiation) command indicates that what follows is
   * subnegotiation of the indicated option.  The subnegotiation is terminated
   * by an IAC SE sequence
   */
  SB = 250,

  /**
   * @description
   * WILL - Indicates the sender desires to begin performing, or confirmation
   * that you are now performing, the indicated option.
   */
  WILL = 251,

  /**
   * @description
   * WONT - Indicates the sender does not desire to perform, or
   * confirmation that you are no longer performing, the indicated option.
   * The receiver must continue to process as if the option was never
   * requested.
   */
  WONT = 252,

  /**
   * @description
   * DO - Indicates the request that the other party perform, or
   * confirmation that you are expecting the other party to perform, the
   * indicated option.
   */
  DO = 253,

  /**
   * @description
   * DONT - Indicates the demand that the other party stop performing,
   * or confirmation that you are no longer expecting the other party to
   * perform, the indicated option.
   * The receiver must continue to process as if the option was never
   * requested.
   */
  DONT = 254,

  /**
   * IAC - Interpret as Command
   *
   * @description
   * The IAC (interpret as command) command is used to tell the other end
   * that what follows is a command, and not data.  The command may be
   * another IAC, which indicates that the following data byte is escaped
   * and is really data, or it may be one of the commands listed below.
   */
  IAC = 255,

  /**
   * NOP - No operation
   *
   * @description
   * The NOP (no operation) command is a data stream element which does
   * nothing.
   *
   * The purpose of the NOP is to provide a data stream element which can
   * be used to pad out a command or subnegotiation, or to provide a
   * synchronization point for a simple protocol.
   */
  NOP = 241,

  /**
   * DM - Data mark
   */
  DM = 242,

  /**
   * BRK - Break
   */
  BRK = 243,

  /**
   * IP - Interrupt process
   *
   * @description
   * The IP (interrupt process) command is a data stream element which
   * tells the other end to interrupt the current process.
   */
  IP = 244,

  /**
   * AO - Abort output
   */
  AO = 245,

  /**
   * AYT - Are you there
   *
   * @description
   * The AYT (are you there) command is a data stream element which asks
   * the other end to send back some visible evidence that it is still
   * there.
   */
  AYT = 246,

  /**
   * EC - Erase character
   */
  EC = 247,

  /**
   * EL - Erase line
   */
  EL = 248,

  /**
   * GA - Go ahead
   */
  GA = 249,

  /**
   * SEND - Sub-process negotiation SEND command
   *
   * @description
   * The SEND command is used to request that the other end send the
   * subnegotiation parameters.  This command is only valid in subnegotiation
   * with the TERMINAL-TYPE SEND command.
   */
  SEND = 1,

  /**
   * IS - Sub-process negotiation IS command
   *
   * @description
   * The IS command is used to indicate the subnegotiation parameters.  This
   * command is only valid in subnegotiation with the TERMINAL-TYPE IS
   * command.
   */
  IS = 0,
}
