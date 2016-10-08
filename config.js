'use strict';
const _ = require('lodash');
require('dotenv').config();

const required = [
	['url', 'GITLAB_URL'],
	['secret', 'SECRET'],
	['publicPagesDir', 'PUBLIC_PAGES_DIR'],
	['publicUrl', 'PUBLIC_URL'],
	['sshPublicKey', 'SSH_PUBLIC_KEY'],
	['sshPrivateKey', 'SSH_PRIVATE_KEY'],
	['clientId', 'CLIENT_ID'],
	['clientSecret', 'CLIENT_SECRET']
];

const config = {
	title: 'gitlab-pages',
	publicPagesDir: 'public/pages'
};

if (process.env.GITLAB_URL) {
	config.url = process.env.GITLAB_URL;
}
if (process.env.PUBLIC_PAGES_DIR) {
	config.publicPagesDir = process.env.PUBLIC_PAGES_DIR;
}
if (process.env.PUBLIC_URL) {
	config.publicUrl = process.env.PUBLIC_URL;
}
if (process.env.SSH_PUBLIC_KEY) {
	config.sshPublicKey = process.env.SSH_PUBLIC_KEY;
}
if (process.env.SSH_PUBLIC_KEY) {
	config.sshPrivateKey = process.env.SSH_PRIVATE_KEY;
}
if (process.env.CLIENT_ID) {
	config.clientId = process.env.CLIENT_ID;
}
if (process.env.CLIENT_SECRET) {
	config.clientSecret = process.env.CLIENT_SECRET;
}
if (process.env.SECRET) {
	config.secret = process.env.SECRET;
}
if (process.env.SSL_CERT) {
	config.sslCert = process.env.SSL_CERT;
}
if (process.env.SSL_KEY) {
	config.sslKey = process.env.SSL_KEY;
}

const missing = required
	.filter(name => !_.get(config, name[0]))
	.map(name => `config.${name[0]} is required but not defined. Provide it via ${name[1]}`);

if (missing.length > 0) {
	throw new Error(missing.join('\n'));
}

module.exports = config;
