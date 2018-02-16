export default {
  input: 'src/AS.js',
  output: [
    { file: 'dist/agentscript.umd.js',
      format: 'umd',
      name: 'AS',
      banner: '/* eslint-disable */'
    },
    { file: 'dist/agentscript.esm.js',
      format: 'es',
      banner: '/* eslint-disable */'
    }
    // { file: 'dist/AS.umd.js',
    //   format: 'umd',
    //   name: 'AS',
    //   banner: '/* eslint-disable */'
    // },
    // { file: 'dist/AS.cjs',
    //   format: 'cjs',
    //   banner: '/* eslint-disable */'
    // }
  ]
}
