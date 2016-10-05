module.exports = getHook;

function getHook(client, id) {
	return client.get(`/projects/${id}/hooks`);
}
