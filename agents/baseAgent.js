class BaseAgent {
  constructor(name, persona, model) {
    this.name = name;
    this.persona = persona;
    this.model = model || 'blackboxai/openai/gpt-4';
  }

  async run(page, pageAnalysis) {
    throw new Error('run() method must be implemented by subclasses');
  }

  getModel() {
    return this.model;
  }

  getName() {
    return this.name;
  }

  getPersona() {
    return this.persona;
  }
}

module.exports = BaseAgent;
