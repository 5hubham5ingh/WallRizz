import { execAsync } from "../constants.js";

/**
 * Determines the number of available CPU threads
 * @returns {Promise<number>} The number of available CPU threads or the default value (4) if unable to determine
 */
export async function getProcessLimit() {
  try {
    const threads = await execAsync("nproc");
    return parseInt(threads, 10) - 1; // Number of available threads minus parent thread
  } catch (e) {
    return 4;
  }
}

/**
 * Executes an array of promise-returning functions with a concurrency limit.
 * @param {Function[]} getTaskPromises - Array of functions that, when called, return a promise.
 * @param {number} [limit] - Concurrency limit
 * @returns {Promise<void>}
 */
export async function promiseQueueWithLimit(getTaskPromises, limit) {
  const pLimit = limit ?? await getProcessLimit();
  const executing = new Set();
  for (const getTaskPromise of getTaskPromises) {
    const promise = getTaskPromise().finally(() => executing.delete(promise));
    executing.add(promise);
    if (executing.size > pLimit) {
      await Promise.race(executing);
    }
  }
  return await Promise.all(executing);
}
