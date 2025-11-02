#!/bin/bash
echo "=== VERIFYING CREATOR NAME IMPLEMENTATION ==="
echo ""
echo "1. GraphQL Query Test:"
curl -s -X POST https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/latest/gn \
  -H "Content-Type: application/json" \
  -d '{"query":"{ courses(first: 1, where: { isDeleted: false, isActive: true }) { id title creator creatorName } }"}' \
  | python3 -c "import sys, json; data = json.load(sys.stdin); course = data['data']['courses'][0]; print(f\"   Title: {course['title']}\"); print(f\"   Creator Address: {course['creator']}\"); print(f\"   Creator Name: {course['creatorName']}\")"

echo ""
echo "2. TypeScript Interface Check:"
grep -A 3 "creator.*:" src/services/goldsky-courses.service.ts | head -5

echo ""
echo "3. GraphQL Query Field Check:"
grep "creatorName" src/services/goldsky-courses.service.ts | head -4

echo ""
echo "4. Component Display Check:"
grep -A 1 "by {" src/components/CourseCard.tsx | grep creatorName

echo ""
echo "=== VERIFICATION COMPLETE ==="
