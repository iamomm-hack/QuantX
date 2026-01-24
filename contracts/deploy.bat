@echo off
REM ============================================
REM QuantX Contract Deploy Script
REM ============================================

echo.
echo ========================================
echo    QuantX Contract Deployment
echo ========================================
echo.

REM Step 1: Build
echo [1/4] Building contract...
cd /d E:\QuantX\contracts\recurring_payment
cargo build --target wasm32-unknown-unknown --release
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo Build successful!
echo.

REM Step 2: Check if identity exists, if not create
echo [2/4] Setting up deployer identity...
stellar keys address deployer >nul 2>&1
if %errorlevel% neq 0 (
    echo Creating new deployer identity...
    stellar keys generate deployer --network testnet
    echo Funding account from friendbot...
    stellar keys fund deployer --network testnet
)
echo Deployer ready!
echo.

REM Step 3: Deploy
echo [3/4] Deploying contract to testnet...
echo This may take a minute...
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/recurring_payment.wasm --source deployer --network testnet > deploy_output.txt 2>&1

if %errorlevel% neq 0 (
    echo ERROR: Deployment failed!
    type deploy_output.txt
    pause
    exit /b 1
)

REM Get contract ID from output
for /f "tokens=*" %%a in (deploy_output.txt) do set CONTRACT_ID=%%a
echo.
echo ========================================
echo   CONTRACT DEPLOYED SUCCESSFULLY!
echo ========================================
echo.
echo Contract ID: %CONTRACT_ID%
echo.

REM Step 4: Initialize contract
echo [4/4] Initializing contract...
for /f "tokens=*" %%a in ('stellar keys address deployer') do set ADMIN_ADDRESS=%%a
stellar contract invoke --id %CONTRACT_ID% --source deployer --network testnet -- initialize --admin %ADMIN_ADDRESS%

if %errorlevel% neq 0 (
    echo WARNING: Initialization may have failed. Check manually.
) else (
    echo Contract initialized with admin: %ADMIN_ADDRESS%
)

echo.
echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Contract ID: %CONTRACT_ID%
echo Admin: %ADMIN_ADDRESS%
echo.
echo NEXT STEPS:
echo 1. Copy the Contract ID above
echo 2. Update these files:
echo    - E:\QuantX\rfi-frontend\.env (NEXT_PUBLIC_CONTRACT_ID)
echo    - E:\QuantX\backend\.env (CONTRACT_ID)
echo    - E:\QuantX\executor\.env (CONTRACT_ID)
echo 3. Restart frontend and backend
echo.

REM Save contract ID to file
echo %CONTRACT_ID% > deployed_contract_id.txt
echo Contract ID saved to: deployed_contract_id.txt

pause
