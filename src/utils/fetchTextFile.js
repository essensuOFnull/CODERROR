export async function fetchTextFile(path) {
	try {
		const response = await fetch(path);
		if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
		return await response.text();
	} catch (error) {
		console.error('Failed to fetch the file:', error);
		return null;
	}
}