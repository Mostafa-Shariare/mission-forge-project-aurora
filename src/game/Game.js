/**
 * MISSION FORGE: PROJECT AURORA
 * Integrated Game Component
 * Path: src/game/Game.js
 */

export class MissionGame {
  constructor(options = {}) {
    this.destination = options.destination || 'mars';
    this.container = options.container || null;
    this.onReturn = options.onReturn || null;
    this.iframe = null;
    this.boundMessageHandler = this.handleMessage.bind(this);
  }

  mount(targetContainer) {
    if (targetContainer) this.container = targetContainer;
    if (!this.container) {
      console.error('MissionGame: No container provided to mount()');
      return;
    }

    // Clean previous contents
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '100%';

    // Create iframe pointing to the Aurora-styled game engine
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'auroraGameIframe';
    this.iframe.src = `/src/game/dist/index.html?v=${Date.now()}&destination=${encodeURIComponent(this.destination)}`;
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';
    this.iframe.style.display = 'block';
    this.iframe.allow = 'autoplay; fullscreen';

    this.container.appendChild(this.iframe);

    window.addEventListener('message', this.boundMessageHandler);
  }

  handleMessage(event) {
    if (!event.data) return;
    if (event.data.type === 'RETURN_TO_DESTINATION_SELECTOR' || event.data.type === 'RETURN_TO_CAROUSEL') {
      if (typeof this.onReturn === 'function') {
        this.onReturn();
      }
    }
  }

  setDestination(destination) {
    this.destination = destination;
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage({
        type: 'SET_DESTINATION',
        destination: destination
      }, '*');
    }
  }

  destroy() {
    window.removeEventListener('message', this.boundMessageHandler);
    if (this.iframe) {
      this.iframe.src = 'about:blank';
      this.iframe.remove();
      this.iframe = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

export function renderGame(container, props = {}) {
  const game = new MissionGame({
    destination: props.destination,
    onReturn: props.onReturn
  });
  game.mount(container);
  return game;
}

export default MissionGame;
