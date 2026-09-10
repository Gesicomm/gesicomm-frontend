import API from './api';

export const onboardingTrackingService = {
  registrarInicio(metadata = {}) {
    return API.post('/auth/onboarding-event', {
      tipo: 'onboarding_started',
      metadata,
    }).then(r => r.data);
  },
};
