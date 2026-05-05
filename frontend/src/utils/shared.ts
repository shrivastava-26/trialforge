/** Shared MUI Stepper sx for all CRUD dialogs */
export const stepperSx = {
  mb: 3,
  '& .MuiStepLabel-label': { fontSize: '0.8rem', fontWeight: 600 },
  '& .MuiStepIcon-root.Mui-active': { color: '#0f766e' },
  '& .MuiStepIcon-root.Mui-completed': { color: '#0f766e' },
};

/** Check if a certificate is valid (not expired) */
export function isCertValid(expiresOn: string): boolean {
  return expiresOn >= new Date().toISOString().slice(0, 10);
}
