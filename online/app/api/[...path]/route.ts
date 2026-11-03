import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {handleApi} from '../../../lib/cloud-api.mjs';
export const dynamic='force-dynamic';
async function handle(request:Request){const user=await getChatGPTUser();return handleApi(request,env,user?.userId);}
export const GET=handle;export const POST=handle;
