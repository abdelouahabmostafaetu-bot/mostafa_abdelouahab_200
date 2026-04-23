import nextVitals from 'eslint-config-next/core-web-vitals';

export default [
  ...nextVitals,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      'Math Q&A Search - AI Enhanced (1)/**',
      'my-library-mongodb/**',
    ],
  },
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
