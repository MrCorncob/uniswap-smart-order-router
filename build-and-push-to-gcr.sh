#!/bin/bash
set -x
V=$(date "+%Y%m%d_%H%M%S")
PROJECT="staging-incognito"
NAME_SPACE="uniswap-mainnet"
BACKEND_IMAGE="uniswap-smart-order-router"
buildNumber=$V


docker build -t gcr.io/$PROJECT/$BACKEND_IMAGE:$buildNumber --build-arg BUILD_ENV=production .

result=$(echo $?)
if [ $result != 0 ] ; then
  echo "$FAIL Failed docker build -t gcr.io/$PROJECT/$BACKEND_IMAGE:$buildNumber $ENDC"
  exit;
else
  echo "$OKGREEN Done: docker build -t gcr.io/$PROJECT/$BACKEND_IMAGE:$buildNumber $ENDC";
fi

docker tag gcr.io/$PROJECT/$BACKEND_IMAGE:$buildNumber gcr.io/$PROJECT/$BACKEND_IMAGE:$buildNumber
#docker push cloud
docker push gcr.io/$PROJECT/$BACKEND_IMAGE:$buildNumber
