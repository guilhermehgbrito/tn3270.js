export enum TN3270TelnetCommands {
  /**
   * CONNECT - Connect
   *
   * @description
   * The CONNECT command attaches the TN3270E session to a specific
   * device.  The CONNECT command is only valid in subnegotiation with the
   * TN3270E CONNECT <device-name> command.
   */
  CONNECT = 1, // Connect

  /**
   * DEVICE_TYPE - Device Type
   *
   * @description
   * The DEVICE_TYPE command is used to request or send the device type.
   *
   * @example TN3270E SEND DEVICE_TYPE
   * @example TN3270 DEVICE_TYPE REQUEST <device-type>
   * @example TN3270 DEVICE_TYPE IS <device-type>
   */
  DEVICE_TYPE = 2, // Device Type

  /**
   * FUNCTIONS - Functions
   *
   * @description
   * The FUNCTIONS command is used to request or send the functions
   * supported by the TN3270E implementation.
   *
   * @example TN3270E FUNCTIONS REQUEST <functions-list>
   * @example TN3270E FUNCTIONS IS <functions-list>
   */
  FUNCTIONS = 3, // Functions

  /**
   * IS - Sub-process negotiation IS command
   *
   * @see TelnetCommands.IS
   */
  IS = 4, // Sub-process negotiation IS command

  /**
   * REASON - Reason
   *
   * @description
   * The REASON command is used to send the reason for a failure.
   *
   * @example TN3270E REJECT REASON <reason-code>
   */
  REASON = 5, // Reason

  /**
   * REJECT - Reject
   *
   * @description
   * The REJECT command is used to reject a request.
   *
   * @example TN3270E REJECT REASON <reason-code>
   */
  REJECT = 6, // Reject

  /**
   * REQUEST - Request
   *
   * @description
   * The REQUEST command is used to request a specific function.
   *
   * @example TN3270E FUNCTIONS REQUEST <functions-list>
   * @example TN3270E DEVICE_TYPE REQUEST <device-type>
   */
  REQUEST = 7, // Request

  /**
   * SEND - Sub-process negotiation SEND command
   *
   * @see TelnetCommands.SEND
   */
  SEND = 8, // Sub-process negotiation SEND command

  /**
   *  EOR - End of Record
   *
   * @description
   *
   * The EOR command is used to indicate the end of a record.  The EOR
   * command is only valid in subnegotiation when the IAC DO EOR command has
   * been sent.
   */
  EOR = 239, // End of Record
}
