export enum TN3270DataTypes {
  /**
   * DATA_3270 - 3270 Data
   *
   * @description
   * The data portion of the message contains only the 3270 data stream.
   */
  DATA_3270 = 0x00,

  /**
   * RESPONSE - Response
   *
   * The data portion of the message constitutes device-status
   * information and the RESPONSE-FLAG field indicates whether
   * this is a positive or negative response
   */
  RESPONSE = 0x02,

  /**
   * NVT_DATA - NVT Data
   *
   * @description
   * The data portion of the message is to be interpreted as NVT data.
   */
  NVT_DATA = 0x05,

  /**
   * REQUEST - Request
   *
   * @description
   * There is no data portion present in the message.
   * Only the REQUEST-FLAG field has any meaning.
   */
  REQUEST = 0x06,
}
