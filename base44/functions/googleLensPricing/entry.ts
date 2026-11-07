import { photoEndpoint } from '../../shared/photoEndpoint.ts';
export default async function(req) { return photoEndpoint(req, 'deep'); }