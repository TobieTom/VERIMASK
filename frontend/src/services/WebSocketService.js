import AuthService from './AuthService';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.callbacks = new Map();
  }
  
  connect() {
    const user = AuthService.getCurrentUser();
    if (!user) return;
    
    const token = user.token;
    const userId = user.id;
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${window.location.host}/ws/notifications/${userId}/?token=${token}`;
    
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = () => {
      console.log('WebSocket connection established');
    };
    
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
    
    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  handleMessage(data) {
    // Notify all registered callbacks
    this.callbacks.forEach(callback => {
      callback(data);
    });
  }
  
  subscribe(id, callback) {
    this.callbacks.set(id, callback);
    
    // Connect if not already connected
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect();
    }
    
    return () => {
      this.callbacks.delete(id);
    };
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

const webSocketService = new WebSocketService();
export default webSocketService;