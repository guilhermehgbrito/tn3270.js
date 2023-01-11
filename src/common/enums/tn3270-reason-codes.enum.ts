export enum TN3270ReasonCodes {
  /**
   * CONNECTION_PARTNER - Connection Partner
   *
   * @description
   * The client used the CONNECT command to request a specific printer but
   * the device-name requested is the partner to some terminal.
   */
  CONN_PARTNER = 0, // Connection Partner

  /**
   * DEVICE_IN_USE - Device In Use
   *
   * @description
   * The requested device-name is already associated with another session.
   */
  DEVICE_IN_USE = 1, // Device in Use

  /**
   * INV_ASSOCIATE - Invalid Associate
   *
   * @description
   * The client used the ASSOCIATE command and either the device-type
   * is not a printer or the device-name is not a terminal.
   */
  INV_ASSOCIATE = 2, // Invalid Associate

  /**
   * INV_NAME - Invalid Name
   *
   * The resource-name or device-name specified in
   * the CONNECT or ASSOCIATE command is not known
   * to the server.
   */
  INV_NAME = 3, // Invalid Name

  /**
   * INV_DEVICE_TYPE - Invalid Device Type
   *
   * @description
   * The server does not support the requested device-type.
   */
  INV_DEVICE_TYPE = 4, // Invalid Device Type

  /**
   * TYPE_NAME_ERROR - Type Name Error
   *
   * @description
   * The requested device-name or resource-name is
   * incompatible with the requested device-type
   * (such as terminal/printer mismatch).
   */
  TYPE_NAME_ERROR = 5, // Type Name Error

  /**
   * UNKNOWN_ERROR - Unknown Error
   *
   * @description
   * Any other error not covered by the other reason codes.
   */
  UNKNOWN_ERROR = 6, // Unknown Error

  /**
   * UNSUPPORTED_REQ - Unsupported Request
   *
   * @description
   * The server is unable to satisfy the type of request sent
   * by the client; e.g., a specific terminal or printer was
   * requested but the server does not have any such pools of
   * device-names defined to it, or the ASSOCIATE command was
   * used but no partner printers are defined to the server.
   */
  UNSUPPORTED_REQ = 7,
}

export const TN3270ReasonCodesText: Record<number, string> = {
  [TN3270ReasonCodes.CONN_PARTNER]: 'Connection Partner',
  [TN3270ReasonCodes.DEVICE_IN_USE]: 'Device in Use',
  [TN3270ReasonCodes.INV_ASSOCIATE]: 'Invalid Associate',
  [TN3270ReasonCodes.INV_NAME]: 'Invalid Name',
  [TN3270ReasonCodes.INV_DEVICE_TYPE]: 'Invalid Device Type',
  [TN3270ReasonCodes.TYPE_NAME_ERROR]: 'Type Name Error',
  [TN3270ReasonCodes.UNKNOWN_ERROR]: 'Unknown Error',
  [TN3270ReasonCodes.UNSUPPORTED_REQ]: 'Unsupported Request',
};
