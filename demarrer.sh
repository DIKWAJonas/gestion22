cd ~/gestion22
if [ -s .cle-stripe ]; then export STRIPE_SECRET_KEY=$(cat .cle-stripe); else export MODE_SIMULATION=1; fi
npm start
