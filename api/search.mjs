import { createHandler } from '../server/handler.mjs';
import { searchPlaces } from '../server/kakao.mjs';
export default createHandler(process.env,fetch,searchPlaces);
