const assert = require('assert');
const querystring = require('querystring');
const _ = require('lodash');
const normalizeUrl = require('normalize-url');
const request = require('request');

module.exports = gitlab;

function gitlab(base) {
	assert(_.isString(base) && base, 'gitlab <base> url must be string');

	return token => {
		assert(_.isString(token) && token, 'gitlab <token> must be string');

		const opts = {
			headers: {
				Authorization: `Bearer ${token}`
			}
		};

		return {
			delete(uri) {
				return new Promise((resolve, reject) => {
					assert(_.isString(uri) && uri, 'gitlab.delete <uri> must be string');
					opts.url = normalizeUrl(`${base}/api/v3/${uri}`);
					opts.json = true;
					opts.method = 'DELETE';
					request(opts, (error, res, data) => {
						if (error) {
							return reject(error);
						}
						if (res.statusCode >= 400) {
							return reject(new Error(data ? data.message : res.statusText));
						}
						return resolve(data);
					});
				});
			},
			get(uri, q) {
				return new Promise((resolve, reject) => {
					const query = q || {};
					assert(_.isString(uri) && uri, 'gitlab.get <uri> must be string');
					assert(_.isPlainObject(query), 'gitlab.get <query> must be plain object');
					opts.url = normalizeUrl(`${base}/api/v3/${uri}?${querystring.stringify(query)}`);
					opts.method = 'GET';
					opts.json = true;

					request(opts, (error, res, data) => {
						if (error) {
							return reject(error);
						}
						if (res.statusCode >= 400) {
							return reject(new Error(data ? data.message : res.statusText));
						}

						const pagination = res.headers['x-page'] ? {
							nextPage: Number(res.headers['x-next-page']),
							page: Number(res.headers['x-page']),
							perPage: Number(res.headers['x-per-page']),
							prevPage: Number(res.headers['x-prev-page']),
							total: Number(res.headers['x-total']),
							totalPages: Number(res.headers['x-total-pages'])
						} : {};

						return resolve({data, pagination});
					});
				});
			},
			post(uri, body) {
				return new Promise((resolve, reject) => {
					assert(_.isString(uri) && uri, 'gitlab.post <uri> must be string');
					assert(_.isPlainObject(body), 'gitlab.post <body> must be plain object');
					opts.url = normalizeUrl(`${base}/api/v3/${uri}`);
					opts.json = true;
					opts.body = body;
					opts.method = 'POST';

					request(opts, (error, res, data) => {
						if (error) {
							return reject(error);
						}
						if (res.statusCode >= 400) {
							return reject(new Error(data ? data.message : res.statusText));
						}
						return resolve(data);
					});
				});
			},
			stream(uri) {
				opts.url = normalizeUrl(`${base}/api/v3/${uri}`);
				opts.method = 'GET';
				return request.get(opts);
			}
		};
	};
}
