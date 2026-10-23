## BACKEND
clear && /Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/start-cmg-emulators.sh


## START PWA
clar;clear && /Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/run-cmg-pwa.sh



## START ANDROID
clar;clear && /Users/andrewstardie/Documents/TUTS/TESTS/cm/cmg-rebuilt/run-cmg-android.sh



### USEFUL COMMANDS


# DELETE A USER IN THE LOCAL FIREBASE EMULATOR
## Option 1 — one-liner with curl (no deps)

bash
EMAIL="rastardie@gmail.com"
HOST="127.0.0.1:9099"
PROJECT="staging"

UID=$(curl -s -X POST \
  "http://$HOST/identitytoolkit.googleapis.com/v1/projects/$PROJECT/accounts:query?key=fake" \
  -H 'Content-Type: application/json' -d '{}' \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(next((u['localId'] for u in d.get('userInfo',[]) if (u.get('email') or '').lower()=='$EMAIL'),''))")

[ -n "$UID" ] && curl -s -X POST \
  "http://$HOST/identitytoolkit.googleapis.com/v1/accounts:delete?key=fake" \
  -H 'Content-Type: application/json' \
  -d "{\"localId\":\"$UID\"}" && echo "deleted $EMAIL ($UID)" || echo "no such local user"


