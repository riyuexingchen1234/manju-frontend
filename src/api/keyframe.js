import request from './user'

export const generateKeyframe = (storyboardDescription, characterImageUrl, sceneImageUrl) => {
  return request.post('/keyframe/generate', { storyboardDescription, characterImageUrl, sceneImageUrl })
}