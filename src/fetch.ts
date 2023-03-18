import fetchUtil, {
    type BodyInit,
    type RequestInit,
} from 'node-fetch-commonjs';
import { log } from './logger/log';

export enum Method {
    GET = 'GET',
    POST = 'POST',
    // PUT = 'PUT',
}
export async function fetch(
    url: URL,
    method: Method,
    body?: BodyInit,
): Promise<string | null> {
    const requestInit: RequestInit = {
        method,
    };
    if (body !== undefined) {
        requestInit.body = body;
        requestInit.headers = { 'Content-Type': 'application/json' };
    }
    try {
        const response = await fetchUtil(url.href, requestInit);
        const responseBody = await response.text();
        return responseBody;
    } catch (error) {
        // TODO
        log.error(error);
        return null;
    }
}
