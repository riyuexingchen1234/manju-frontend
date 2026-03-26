import request from './user'

export const generateScene = (scenePrompt) => {
  return request.post('/scene/generate', { scenePrompt })
}