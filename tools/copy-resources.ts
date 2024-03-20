import * as fs from 'fs';
import * as path from 'path';

const __root = path.dirname(__dirname);
const __public = path.join(__root, 'public');
const __dist = path.join(__root, 'dist');

fs.cpSync(__public, __dist, {recursive: true});
