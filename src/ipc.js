// ipc.js — кладём в корень приложения, подхватится автоматически.
import electronPkg from 'electron';
const { ipcMain, app } = electronPkg;
import fs from 'fs/promises';
import path from 'path';

// Кроссплатформенный путь к корню приложения через path.join
const ROOT = path.join(app.getAppPath(), 'componentapps', 'CODERROR');

/** Приводит относительный путь к абсолютному*/
function resolveSafe(rel) {
	// игра должна иметь доступ ко всему по рофлу)
	return path.resolve(ROOT, rel);
}

ipcMain.handle('fs:readFile', async (_e, rel, encoding = null) => {
	const abs = resolveSafe(rel);
	if (encoding === 'utf8' || encoding === 'utf-8') {
		return await fs.readFile(abs, 'utf8');
	}
	// Возвращаем Uint8Array — structured clone через IPC её переживёт.
	const buf = await fs.readFile(abs);
	return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
});

ipcMain.handle('fs:writeFile', async (_e, rel, data, encoding = null) => {
	const abs = resolveSafe(rel);
	await fs.mkdir(path.dirname(abs), { recursive: true });

	if (typeof data === 'string') {
		await fs.writeFile(abs, data, encoding || 'utf8');
	} else if (data instanceof ArrayBuffer) {
		await fs.writeFile(abs, Buffer.from(data));
	} else if (ArrayBuffer.isView(data)) {
		await fs.writeFile(abs, Buffer.from(data.buffer, data.byteOffset, data.byteLength));
	} else {
		throw new Error('fs:writeFile: неподдерживаемый тип данных: ' + Object.prototype.toString.call(data));
	}
	return true;
});

ipcMain.handle('fs:list', async (_e, rel = '.') => {
	const abs = resolveSafe(rel);
	const entries = await fs.readdir(abs, { withFileTypes: true });
	return entries.map((e) => ({
		name: e.name,
		isDirectory: e.isDirectory(),
		isFile: e.isFile(),
	}));
});

ipcMain.handle('fs:exists', async (_e, rel) => {
	try {
		await fs.access(resolveSafe(rel));
		return true;
	} catch {
		return false;
	}
});

ipcMain.handle('fs:mkdir', async (_e, rel) => {
	await fs.mkdir(resolveSafe(rel), { recursive: true });
	return true;
});

ipcMain.handle('fs:stat', async (_e, rel) => {
	const s = await fs.stat(resolveSafe(rel));
	return {
		size: s.size,
		isDirectory: s.isDirectory(),
		isFile: s.isFile(),
		mtime: s.mtimeMs,
	};
});

ipcMain.handle('fs:unlink', async (_e, rel) => {
	await fs.unlink(resolveSafe(rel));
	return true;
});

ipcMain.handle('fs:rmdir', async (_e, rel) => {
	await fs.rm(resolveSafe(rel), { recursive: true, force: true });
	return true;
});
