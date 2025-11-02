const fetch = require('node-fetch');

const query = `
  query GetAllCourses {
    courses(
      where: { isDeleted: false, isActive: true }
      orderBy: createdAt
      orderDirection: desc
      first: 3
    ) {
      id
      title
      creator
      creatorName
    }
  }
`;

fetch(process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
})
.then(r => r.json())
.then(data => {
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error('Error:', err));
