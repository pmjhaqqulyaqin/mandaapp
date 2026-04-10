const axios = require('axios');

async function test() {
  const res = await axios.get('https://mandualotim.sch.id');
  const jsMatch = res.data.match(/<script type="module" crossorigin src="(.*?)"><\/script>/);
  if (jsMatch) {
    const jsUrl = jsMatch[1];
    const jsRes = await axios.get('https://mandualotim.sch.id' + jsUrl);
    console.log('Bundle:', jsUrl);
    console.log('Contains allEmployees prop:', jsRes.data.includes('allEmployees'));
    console.log('Contains fallback e.task check:', jsRes.data.includes('kepala madrasah'));
    console.log('Contains Promise.all API fetch:', jsRes.data.includes('Promise.all(['));
  } else {
    console.log('body: ', res.data.substring(0, 500));
  }
}
test();
