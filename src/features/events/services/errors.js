/** Errores de la capa de datos (compartidos por los repositorios y el cliente RPC). */

export class RepositoryError extends Error {
  /** @param {string} message @param {{ cause?: unknown, status?: number }} [options] */
  constructor(message, { cause, status } = {}) {
    super(message, { cause });
    this.name = "RepositoryError";
    this.status = status;
  }
}
