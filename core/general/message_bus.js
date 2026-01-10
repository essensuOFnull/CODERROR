class message_bus {
	constructor(targetWindow, myWindow = window) {
		this.targetWindow = targetWindow;
		this.myWindow = myWindow;
		this.callbacks = new Map();
		this.handlers = new Map();
		this.nextId = 0;
		
		this.myWindow.addEventListener('message', this._handleMessage.bind(this));
	}

	// Регистрация обработчиков сообщений
	on(type, handler) {
		this.handlers.set(type, handler);
	}

	// Отправка сообщения с ожиданием ответа
	async send(type, data) {
		const id = this.nextId++;
		
		return new Promise((resolve, reject) => {
			this.callbacks.set(id, { resolve, reject });
			
			this.targetWindow.postMessage({
				type,
				id,
				data
			}, '*'); // Используем '*' как origin для sandbox
		});
	}

	// Обработка входящих сообщений
	async _handleMessage(event) {
		const { type, id, data } = event.data;

		// Обработка ответов на наши запросы
		if (type === 'RESPONSE') {
			const callback = this.callbacks.get(id);
			if (callback) {
				this.callbacks.delete(id);
				event.data.success ? 
				callback.resolve(event.data.data) : 
				callback.reject(new Error(event.data.error));
			}
			return;
		}

		// Обработка входящих запросов
		try {
			const handler = this.handlers.get(type);
			if (!handler) {
				throw new Error(`No handler for message type: ${type}`);
			}

			const result = await handler(data);
			
			event.source.postMessage({
				type: 'RESPONSE',
				id,
				data: result,
				success: true
			}, '*');
		} catch (error) {
			event.source.postMessage({
				type: 'RESPONSE',
				id,
				error: error.message,
				success: false
			}, '*');
		}
	}
}