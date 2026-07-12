#!/usr/bin/env sh
# Re-vendor the scripts + catalog + candidate seed from the parent TopRated repo
# into this kit, so the kit stays a self-contained, copyable folder.
#
# Run from anywhere:  sh image-review-kit/refresh-from-repo.sh
set -e
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/.." && pwd)"

mkdir -p "$here/scripts" "$here/data" "$here/work"
cp "$repo/scripts/build_review.py"  "$here/scripts/"
cp "$repo/scripts/review_server.py" "$here/scripts/"
cp "$repo/scripts/enrich_images.py" "$here/scripts/"
cp "$repo/data/db.json"             "$here/data/db.json"

if [ -f "$repo/scripts/image_candidates.json" ]; then
  cp "$repo/scripts/image_candidates.json" "$here/work/image_candidates.json"
  echo "Copied candidate seed ($(wc -c < "$here/work/image_candidates.json") bytes)."
else
  echo "No image_candidates.json in repo yet — kit will start with an empty review set."
fi

echo "Re-vendored into $here"
