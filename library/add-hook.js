module.exports = addHook;

function addHook(client, id, data) {
	return client.post(`/projects/${id}/hooks`, data);
}
