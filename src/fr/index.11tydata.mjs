import { existsSync, readFileSync } from 'node:fs';
import yaml from 'js-yaml';

const { fr_validated: ok } = yaml.load(readFileSync('data/site.yaml', 'utf8'));
const preview = Boolean(process.env.FR_FILE) && existsSync(process.env.FR_FILE);
export default { permalink: (ok && existsSync('data/fr.yaml')) || preview ? '/fr/' : false };
