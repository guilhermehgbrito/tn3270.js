export enum TN3270ResponseFlags {
  /**
   * NO_RESPONSE - No Response
   *
   * @description
   * The sender does not expect the receiver to respond either
   * positively or negatively to this message.  The receiver must
   * therefore not send any response to this data-message.
   */
  NO_RESPONSE = 0x00,

  /**
   * ERROR_RESPONSE - Error Response
   *
   * @description
   * The sender only expects the receiver to respond to this message
   * if some type of error occurred, in which case a negative response
   * must be sent by the receiver.
   */
  ERROR_RESPONSE = 0x01,

  /**
   * ALWAYS_RESPONSE - Always Response
   *
   * @description
   * The sender expects the receiver to respond negatively if an
   * error occurs, or positively if no errors occur.  One or the
   * other must always be sent by the receiver.
   */
  ALWAYS_RESPONSE = 0x02,

  /**
   * POSITIVE_RESPONSE - Positive Response
   *
   * @description
   * The previous message was received and executed successfully
   * with no errors.
   */
  POSITIVE_RESPONSE = 0x00,

  /**
   * NEGATIVE_RESPONSE - Negative Response
   *
   * @description
   * The previous message was receiveD but an error(s) occurred
   * while processing it.
   */
  NEGATIVE_RESPONSE = 0x01,
}
