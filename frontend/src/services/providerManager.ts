import { Provider } from '../types/query'

export class ProviderManager {
  private providers: Provider[] = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Advanced AI model with multimodal capabilities',
      status: 'active',
      type: 'ai',
      capabilities: ['text', 'image', 'analysis', 'research']
    },
    {
      id: 'perplexity',
      name: 'Perplexity AI',
      description: 'Research-focused AI with web search integration',
      status: 'active',
      type: 'ai',
      capabilities: ['search', 'research', 'analysis']
    },
    {
      id: 'openai',
      name: 'OpenAI GPT',
      description: 'General purpose AI model',
      status: 'inactive',
      type: 'ai',
      capabilities: ['text', 'analysis']
    }
  ]

  async getProviders(): Promise<Provider[]> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.providers)
      }, 100)
    })
  }

  async getProvider(id: string): Promise<Provider | null> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const provider = this.providers.find(p => p.id === id)
        resolve(provider || null)
      }, 100)
    })
  }

  async addProvider(provider: Omit<Provider, 'id'>): Promise<Provider> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const newProvider: Provider = {
          ...provider,
          id: Date.now().toString()
        }
        this.providers.push(newProvider)
        resolve(newProvider)
      }, 100)
    })
  }

  async updateProvider(id: string, updates: Partial<Provider>): Promise<Provider | null> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = this.providers.findIndex(p => p.id === id)
        if (index === -1) {
          resolve(null)
          return
        }

        this.providers[index] = {
          ...this.providers[index],
          ...updates
        }
        resolve(this.providers[index])
      }, 100)
    })
  }

  async deleteProvider(id: string): Promise<boolean> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = this.providers.findIndex(p => p.id === id)
        if (index === -1) {
          resolve(false)
          return
        }

        this.providers.splice(index, 1)
        resolve(true)
      }, 100)
    })
  }

  async testProvider(id: string): Promise<{ success: boolean; message: string }> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const provider = this.providers.find(p => p.id === id)
        if (!provider) {
          resolve({ success: false, message: 'Provider not found' })
          return
        }

        if (provider.status === 'active') {
          resolve({ success: true, message: 'Provider is working correctly' })
        } else {
          resolve({ success: false, message: 'Provider is not active' })
        }
      }, 1000)
    })
  }
}

export default ProviderManager