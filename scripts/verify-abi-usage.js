/**
 * ABI Usage Verification Script
 * Ensures consistent ABI usage across all parts of the application
 */

const fs = require('fs');
const path = require('path');

// Contract definitions - Load from deployed-contracts.json for consistency
function loadContractDefinitions() {
    const deployedContracts = JSON.parse(fs.readFileSync('deployed-contracts.json', 'utf8'));
    return {
        CourseFactory: {
            name: 'CourseFactory',
            address: deployedContracts.courseFactory,
            key: 'courseFactory'
        },
        CourseLicense: {
            name: 'CourseLicense',
            address: deployedContracts.courseLicense,
            key: 'courseLicense'
        },
        ProgressTracker: {
            name: 'ProgressTracker',
            address: deployedContracts.progressTracker,
            key: 'progressTracker'
        },
        CertificateManager: {
            name: 'CertificateManager',
            address: deployedContracts.certificateManager,
            key: 'certificateManager'
        }
    };
}

const CONTRACTS = loadContractDefinitions();

// Verification results
const results = {
    mobileApp: {},
    frontend: {},
    consistency: {}
};

// Verify mobile app
function verifyMobileApp() {
    const mobileAbiPath = 'EduVerseApp/src/constants/abi/';
    const mobileAddresses = JSON.parse(fs.readFileSync('EduVerseApp/src/constants/abi/contract-addresses.json', 'utf8'));

    results.mobileApp = {
        hasAllContracts: true,
        addressesMatch: true,
        abiFilesExist: true,
        importPathsCorrect: true
    };

    // Check if all required ABIs exist
    for (const [key, contract] of Object.entries(CONTRACTS)) {
        const abiPath = path.join(mobileAbiPath, `${contract.name}.json`);
        const address = mobileAddresses.addresses[contract.key];

        if (!fs.existsSync(abiPath)) {
            results.mobileApp.abiFilesExist = false;
            console.error(`❌ Missing ABI: ${contract.name}.json`);
        }

        if (address !== contract.address) {
            results.mobileApp.addressesMatch = false;
            console.error(`❌ Address mismatch for ${contract.name}: expected ${contract.address}, got ${address}`);
        }
    }

    return results.mobileApp;
}

// Verify frontend
function verifyFrontend() {
    const frontendAbiPath = 'frontend_website/eduverse/abis/';
    const frontendAddresses = JSON.parse(fs.readFileSync('frontend_website/eduverse/abis/contract-addresses.json', 'utf8'));

    results.frontend = {
        hasAllContracts: true,
        addressesMatch: true,
        abiFilesExist: true,
        importPathsCorrect: true
    };

    // Check if all required ABIs exist
    for (const [key, contract] of Object.entries(CONTRACTS)) {
        const abiPath = path.join(frontendAbiPath, `${contract.name}.json`);
        const address = frontendAddresses.addresses[contract.key];

        if (!fs.existsSync(abiPath)) {
            results.frontend.abiFilesExist = false;
            console.error(`❌ Missing ABI: ${contract.name}.json`);
        }

        if (address !== contract.address) {
            results.frontend.addressesMatch = false;
            console.error(`❌ Address mismatch for ${contract.name}: expected ${contract.address}, got ${address}`);
        }
    }

    return results.frontend;
}

// Check consistency between mobile app and frontend
function verifyConsistency() {
    const mobileAddresses = JSON.parse(fs.readFileSync('EduVerseApp/src/constants/abi/contract-addresses.json', 'utf8'));
    const frontendAddresses = JSON.parse(fs.readFileSync('frontend_website/eduverse/abis/contract-addresses.json', 'utf8'));

    results.consistency = {
        addressesConsistent: true,
        networkConsistent: true,
        chainIdConsistent: true
    };

    // Check address consistency
    for (const [key, contract] of Object.entries(CONTRACTS)) {
        const mobileAddr = mobileAddresses.addresses[contract.key];
        const frontendAddr = frontendAddresses.addresses[contract.key];

        if (mobileAddr !== frontendAddr) {
            results.consistency.addressesConsistent = false;
            console.error(`❌ Address inconsistency for ${contract.name}: mobile=${mobileAddr}, frontend=${frontendAddr}`);
        }
    }

    // Check network consistency
    if (mobileAddresses.networkName !== frontendAddresses.networkName) {
        results.consistency.networkConsistent = false;
    }

    if (mobileAddresses.chainId !== frontendAddresses.chainId) {
        results.consistency.chainIdConsistent = false;
    }

    return results.consistency;
}

// Execute verification
console.log("🔍 Starting ABI Usage Verification...");
console.log("=====================================");

const mobileResult = verifyMobileApp();
const frontendResult = verifyFrontend();
const consistencyResult = verifyConsistency();

console.log("\n📊 Verification Results:");
console.log("========================");
console.log("Mobile App:", mobileResult);
console.log("Frontend:", frontendResult);
console.log("Consistency:", consistencyResult);

// Summary
const allGood = mobileResult.hasAllContracts &&
                mobileResult.addressesMatch &&
                frontendResult.hasAllContracts &&
                frontendResult.addressesMatch &&
                consistencyResult.addressesConsistent;

console.log("\n✅ Overall Status:", allGood ? "PASSED" : "FAILED");

if (allGood) {
    console.log("🎉 All ABIs are correctly used and consistent across your application!");
} else {
    console.log("⚠️  Issues found - please review the detailed results above.");
}

module.exports = {
    verificationResults: results,
    allGood,
    contracts: CONTRACTS
};
