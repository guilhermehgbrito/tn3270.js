export enum TelnetProtocolOptions {
  /**
   * Binary Transmission
   *
   * @description
   * The Binary Transmission option specifies that the data will be
   * transmitted in eight-bit bytes.  This option is used to tell the other
   * end that it should not use any eight-bit byte values as data stream
   * commands, including IAC, which otherwise would have special
   * interpretation.
   */
  BINARY = 0, // Binary Transmission

  /**
   * EOR - End of Record
   *
   * @description
   * The EOR (end of record) option specifies that the data stream will
   * consist of records, each terminated by an EOR mark.  The EOR mark is
   * a sequence of two bytes: IAC EOR.  The EOR option is used to tell the
   * other end that it should not interpret IAC EOR as a data stream
   * command.
   */
  EOR = 25, // End of Record

  /**
   * TERMINAL-TYPE - Terminal Type
   *
   * @description
   * The TERMINAL-TYPE option specifies that the terminal type will be
   * sent to the other end.  The TERMINAL-TYPE option is used to tell the
   * other end that it should send the terminal type.
   *
   * @example TERMINAL-TYPE IS <terminal type>
   * @example TERMINAL-TYPE SEND
   */
  TERMINAL_TYPE = 24, // Terminal Type
}
