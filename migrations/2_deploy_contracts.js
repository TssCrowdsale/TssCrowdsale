var TssCrowdsale = artifacts.require("TssCrowdsale");
const BigNumber = web3.BigNumber;

var timeUtils = require("../test/zeppelin-imports/helpers/increaseTime");

module.exports = async function (deployer, network, accounts) {

    const RATE = new BigNumber(10); // this isn't actually used for calculations, just initialisation
    const PHASE_1_RATE = new BigNumber(1150);
    const PHASE_2_RATE = new BigNumber(1100);
    const PHASE_3_RATE = new BigNumber(1050);

    const phase_1_start = 1519547200 + timeUtils.duration.minutes(0);
    const phase_2_start = phase_1_start + timeUtils.duration.minutes(15);
    const phase_3_start = phase_2_start + timeUtils.duration.minutes(15);
    const postsale_start = phase_3_start + timeUtils.duration.minutes(15);

    // const phase_1_start = 1509454809;
    // const phase_2_start = 1509454809;
    // const phase_3_start = 1509454809;
    // const postsale_start = 1509454809;

    founder_wallet = "0x5c76a01ab0356Df0A76cc310871E8206D88d7B63";
    bounty_wallet = "0x9471751ee3c6953729c2429c7A82cb3e0351971e";
    future_wallet = "0xd7da313AC016350E7D0B0c09e34e0Abbb8ab1cBE"; 
    presale_wallet = "0x125D255597bA8CDe74fd1A7623632C9bb5264736";
    wallet = "0xfF18d12CD184fcC08937beA0bfb37Ea9cb4ed780";

    // founder_wallet = accounts[0];
    // bounty_wallet = accounts[1];
    // future_wallet = accounts[2];
    // presale_wallet = accounts[3];
    // wallet = accounts[4];


    console.log(
        //TssCrowdsale, 
        RATE, 
        wallet,
        
        phase_1_start, 
        phase_2_start, 
        phase_3_start, 
        postsale_start,
        
        founder_wallet, 
        bounty_wallet, 
        future_wallet, 
        presale_wallet
    )
    deployer.deploy(TssCrowdsale, 
            RATE, 
            wallet,
            
            phase_1_start, 
            phase_2_start, 
            phase_3_start, 
            postsale_start,
            
            founder_wallet, 
            bounty_wallet, 
            future_wallet, 
            presale_wallet
    );
};
