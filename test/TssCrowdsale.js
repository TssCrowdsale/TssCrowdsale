import ether from './zeppelin-imports/helpers/ether'
import {
    advanceBlock
} from './zeppelin-imports/helpers/advanceToBlock'
import {
    increaseTimeTo,
    duration
} from './zeppelin-imports/helpers/increaseTime'
import latestTime from './zeppelin-imports/helpers/latestTime'
import EVMThrow from './zeppelin-imports/helpers/EVMThrow'

const BigNumber = web3.BigNumber;

const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const TssCrowdsale = artifacts.require('../contracts/TssCrowdsale.sol');
const TssToken = artifacts.require('../contracts/TssToken.sol');

contract('TssCrowdsale', function ([owner, wallet, investor, investor2,
    founder_wallet, bounty_wallet, future_wallet, crowdsale_wallet, presale_wallet
]) {

    const RATE = new BigNumber(10);
    const PHASE_1_RATE = new BigNumber(1150);
    const PHASE_2_RATE = new BigNumber(1100);
    const PHASE_3_RATE = new BigNumber(1050);

    before(async function () {
        //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock()
    });

    beforeEach(async function () {
        this.startTime = latestTime() + duration.weeks(1);
        this.endTime = this.startTime + duration.weeks(4);
        this.afterEndTime = this.endTime + duration.seconds(1);

        this.phase_1_start = this.startTime;
        this.phase_2_start = this.phase_1_start + duration.weeks(1);
        this.phase_3_start = this.phase_2_start + duration.weeks(2);
        this.postsale_start = this.phase_3_start + duration.weeks(1);

        this.crowdsale = await TssCrowdsale.new(
            RATE,
            wallet,
            this.phase_1_start,
            this.phase_2_start,
            this.phase_3_start,
            this.postsale_start,

            founder_wallet,
            bounty_wallet,
            future_wallet,
            presale_wallet
        );

        this.token = TssToken.at(await this.crowdsale.token());
    });


    it('should create crowdsale with correct parameters and mint the correct number of tokens to respective wallets', async function () {
        this.crowdsale.should.exist;
        this.token.should.exist;
        (await this.crowdsale.startTime()).should.be.bignumber.equal(this.startTime);
        (await this.crowdsale.endTime()).should.be.bignumber.equal(this.endTime);
        (await this.crowdsale.CROWDSALE_PHASE_1_START()).should.be.bignumber.equal(this.phase_1_start);
        (await this.crowdsale.CROWDSALE_PHASE_2_START()).should.be.bignumber.equal(this.phase_2_start);
        (await this.crowdsale.CROWDSALE_PHASE_3_START()).should.be.bignumber.equal(this.phase_3_start);
        (await this.crowdsale.POSTSALE_START()).should.be.bignumber.equal(this.postsale_start);

        web3.fromWei((await this.token.balanceOf(founder_wallet)), "ether").should.be.bignumber.equal(new BigNumber('100000000'));
        web3.fromWei((await this.token.balanceOf(bounty_wallet)), "ether").should.be.bignumber.equal(new BigNumber('25000000'));
        web3.fromWei((await this.token.balanceOf(future_wallet)), "ether").should.be.bignumber.equal(new BigNumber('275000000'));
        web3.fromWei((await this.token.balanceOf(this.crowdsale.address)), "ether").should.be.bignumber.equal(new BigNumber('97000000'));
        web3.fromWei((await this.token.balanceOf(presale_wallet)), "ether").should.be.bignumber.equal(new BigNumber('3000000'));
        web3.fromWei((await this.token.totalSupply()), "ether").should.be.bignumber.equal(new BigNumber("500000000"));

        (await this.token.mintingFinished())
        // (await this.crowdsale.rate()).should.be.bignumber.equal(RATE);
        // (await this.crowdsale.wallet()).should.be.equal(wallet);
        // (await this.crowdsale.cap()).should.be.bignumber.equal(CAP);
    });

    it('should not accept payments before start', async function () {
        await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMThrow);
        await this.crowdsale.buyTokens(investor, {
            from: investor,
            value: ether(1)
        }).should.be.rejectedWith(EVMThrow);
    });

    it('should accept payments during the sale', async function () {
        const investmentAmount = ether(1);
        const expectedTokenAmount = PHASE_1_RATE.mul(investmentAmount);

        await increaseTimeTo(this.startTime);
        await this.crowdsale.buyTokens(investor, {
            value: investmentAmount,
            from: investor
        }).should.be.fulfilled;

        (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
        web3.fromWei((await this.token.totalSupply()), "ether").should.be.bignumber.equal(new BigNumber("500000000"));
    });

    it('should reject payments after end', async function () {
        await increaseTimeTo(this.afterEnd);
        await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMThrow);
        await this.crowdsale.buyTokens(investor, {
            value: ether(1),
            from: investor
        }).should.be.rejectedWith(EVMThrow);
    });


    describe('ensureStage', async function () {
        it('should correctly set the stage to presale after initialising', async function () {
            let current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(2);
        })

        it('shouldnt do anything if stage is presale and is called before phase 1 start', async function () {
            await this.crowdsale.setCurrentStage();
            let current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(2);
        })

        it('should correctly set the stage to phase 1', async function () {
            await increaseTimeTo(this.phase_1_start);
            await this.crowdsale.setCurrentStage();
            let current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(3);
        })

        it('shouldnt do anything if is phase 1 and called again before phase 2', async function () {
            await increaseTimeTo(this.phase_1_start);
            await this.crowdsale.setCurrentStage();
            let current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(3);
            await this.crowdsale.setCurrentStage();
            current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(3);
        })

        it('should correctly set the stage to phase 2', async function () {
            await increaseTimeTo(this.phase_2_start);
            await this.crowdsale.setCurrentStage();
            let current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(4);
        })

        it('shouldnt do anything if is phase 2 and called again before phase 3', async function () {
            await increaseTimeTo(this.phase_2_start);
            await this.crowdsale.setCurrentStage();
            let current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(4);
            await this.crowdsale.setCurrentStage();
            current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(4);
        })

        it('should correctly set the stage to phase 3', async function () {
            await increaseTimeTo(this.phase_3_start);
            await this.crowdsale.setCurrentStage();
            let current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(5);
        })

        it('shouldnt do anything if is phase 3 and called again before post sale', async function () {
            await increaseTimeTo(this.phase_3_start);
            await this.crowdsale.setCurrentStage();
            let current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(5);
            await this.crowdsale.setCurrentStage();
            current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(5);
        })

        it('should correctly set the stage to post sale', async function () {
            await increaseTimeTo(this.postsale_start);
            await this.crowdsale.setCurrentStage();
            let current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(6);
        })

        it('shouldnt do anything if is post sale and called again', async function () {
            await increaseTimeTo(this.postsale_start);
            await this.crowdsale.setCurrentStage();
            let current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(6);
            await this.crowdsale.setCurrentStage();
            current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(6);
        })
    })

    describe('getCurrentRate', async function () {
        it('should return the correct rate in presale', async function () {
            let actual_rate = await this.crowdsale.getCurrentRate();
            actual_rate.should.be.bignumber.equal(0);
        })

        it('should return the correct rate in crowdsale phase 1', async function () {
            await increaseTimeTo(this.phase_1_start);
            await this.crowdsale.setCurrentStage();

            let actual_rate = await this.crowdsale.getCurrentRate();
            actual_rate.should.be.bignumber.equal(1150);
        })

        it('should return the correct rate in crowdsale phase 2', async function () {
            await increaseTimeTo(this.phase_2_start);
            await this.crowdsale.setCurrentStage();

            let actual_rate = await this.crowdsale.getCurrentRate();
            actual_rate.should.be.bignumber.equal(1100);
        })

        it('should return the correct rate in crowdsale phase 3', async function () {
            await increaseTimeTo(this.phase_3_start);
            await this.crowdsale.setCurrentStage();

            let actual_rate = await this.crowdsale.getCurrentRate();
            actual_rate.should.be.bignumber.equal(1050);
        })

        it('should return the correct rate in post sale', async function () {
            await increaseTimeTo(this.postsale_start);
            await this.crowdsale.setCurrentStage();

            let actual_rate = await this.crowdsale.getCurrentRate();
            actual_rate.should.be.bignumber.equal(0);
        })
    })

    describe('buyTokens', async function () {
        let proceeds_wallet_prior_balance;

        beforeEach('checking proceeds wallet balance', async function () {
            proceeds_wallet_prior_balance = (await web3.fromWei(web3.eth.getBalance(wallet), "ether"));
        })

        afterEach('checks that total supply has not changed', async function () {
            web3.fromWei((await this.token.totalSupply()), "ether").should.be.bignumber.equal(new BigNumber("500000000"));
        })

        it('should not work before phase 1', async function () {
            let current_stage = await this.crowdsale.currentStage();

            current_stage.should.be.bignumber.lessThan(3);

            await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMThrow);
            await this.crowdsale.buyTokens(investor, {
                from: investor,
                value: ether(1)
            }).should.be.rejectedWith(EVMThrow);

            let proceeds_wallet_after_balance = (await web3.fromWei(web3.eth.getBalance(wallet), "ether"));
            proceeds_wallet_after_balance.should.be.bignumber.equal(proceeds_wallet_prior_balance)
        })

        it('should not work if purchase is < 0.01 ether', async function () {
            const investmentAmount = ether(0.001);

            await increaseTimeTo(this.startTime);

            await this.crowdsale.buyTokens(investor, {
                from: investor,
                value: investmentAmount
            }).should.be.rejectedWith(EVMThrow);
            let proceeds_wallet_after_balance = (await web3.fromWei(web3.eth.getBalance(wallet), "ether"));
            proceeds_wallet_after_balance.should.be.bignumber.equal(proceeds_wallet_prior_balance)
        })

        it('should use a rate of 1150 for phase 1', async function () {
            const investmentAmount = ether(1);
            const expectedTokenAmount = PHASE_1_RATE.mul(investmentAmount);

            await increaseTimeTo(this.startTime);
            await this.crowdsale.buyTokens(investor, {
                value: investmentAmount,
                from: investor
            }).should.be.fulfilled;

            (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
            let proceeds_wallet_after_balance = (await web3.fromWei(web3.eth.getBalance(wallet), "ether"));
            proceeds_wallet_after_balance.should.be.bignumber.equal(proceeds_wallet_prior_balance.plus(1))
        })

        it('should use a rate of 1100 for phase 2', async function () {
            const investmentAmount = ether(1);
            const expectedTokenAmount = PHASE_2_RATE.mul(investmentAmount);

            await increaseTimeTo(this.phase_2_start);
            await this.crowdsale.buyTokens(investor, {
                value: investmentAmount,
                from: investor
            }).should.be.fulfilled;

            (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
            let proceeds_wallet_after_balance = (await web3.fromWei(web3.eth.getBalance(wallet), "ether"));
            proceeds_wallet_after_balance.should.be.bignumber.equal(proceeds_wallet_prior_balance.plus(1))
        })

        it('should use a rate of 1050 for phase 3', async function () {
            const investmentAmount = ether(1);
            const expectedTokenAmount = PHASE_3_RATE.mul(investmentAmount);

            await increaseTimeTo(this.phase_3_start);
            await this.crowdsale.buyTokens(investor, {
                value: investmentAmount,
                from: investor
            }).should.be.fulfilled;

            (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
            let proceeds_wallet_after_balance = (await web3.fromWei(web3.eth.getBalance(wallet), "ether"));
            proceeds_wallet_after_balance.should.be.bignumber.equal(proceeds_wallet_prior_balance.plus(1))
        })

        it('should not work post sale', async function () {
            await increaseTimeTo(this.postsale_start);
            await this.crowdsale.setCurrentStage();

            let current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(6);

            await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMThrow);
            await this.crowdsale.buyTokens(investor, {
                from: investor,
                value: ether(1)
            }).should.be.rejectedWith(EVMThrow);
            let proceeds_wallet_after_balance = (await web3.fromWei(web3.eth.getBalance(wallet), "ether"));
            proceeds_wallet_after_balance.should.be.bignumber.equal(proceeds_wallet_prior_balance)
        })

        it('should work for 1 ether purchase', async function () {
            const investmentAmount = ether(1);
            const expectedTokenAmount = PHASE_1_RATE.mul(investmentAmount);

            await increaseTimeTo(this.startTime);
            await this.crowdsale.buyTokens(investor, {
                value: investmentAmount,
                from: investor
            }).should.be.fulfilled;

            (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
            let proceeds_wallet_after_balance = (await web3.fromWei(web3.eth.getBalance(wallet), "ether"));
            proceeds_wallet_after_balance.should.be.bignumber.equal(proceeds_wallet_prior_balance.plus(1))
        })

        it('should work for 10 ether purchase', async function () {
            const investmentAmount = ether(10);
            const expectedTokenAmount = PHASE_1_RATE.mul(investmentAmount);

            await increaseTimeTo(this.startTime);
            await this.crowdsale.buyTokens(investor, {
                value: investmentAmount,
                from: investor
            }).should.be.fulfilled;

            (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
            let proceeds_wallet_after_balance = (await web3.fromWei(web3.eth.getBalance(wallet), "ether"));
            proceeds_wallet_after_balance.should.be.bignumber.equal(proceeds_wallet_prior_balance.plus(10))
        })

        it('should work for 100 ether purchase', async function () {
            const investmentAmount = ether(100);
            const expectedTokenAmount = PHASE_1_RATE.mul(investmentAmount);

            await increaseTimeTo(this.startTime);
            await this.crowdsale.buyTokens(investor, {
                value: investmentAmount,
                from: investor
            }).should.be.fulfilled;

            (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
            let proceeds_wallet_after_balance = (await web3.fromWei(web3.eth.getBalance(wallet), "ether"));
            proceeds_wallet_after_balance.should.be.bignumber.equal(proceeds_wallet_prior_balance.plus(100))
        })

        it('should work for 1000 ether purchase', async function () {
            const investmentAmount = ether(1000);
            const expectedTokenAmount = PHASE_1_RATE.mul(investmentAmount);

            await increaseTimeTo(this.startTime);
            await this.crowdsale.buyTokens(investor, {
                value: investmentAmount,
                from: investor
            }).should.be.fulfilled;

            (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
            let proceeds_wallet_after_balance = (await web3.fromWei(web3.eth.getBalance(wallet), "ether"));
            proceeds_wallet_after_balance.should.be.bignumber.equal(proceeds_wallet_prior_balance.plus(1000))
        })

        it('should work for 10000 ether purchase', async function () {
            const investmentAmount = ether(10000);
            const expectedTokenAmount = PHASE_1_RATE.mul(investmentAmount);

            await increaseTimeTo(this.startTime);
            await this.crowdsale.buyTokens(investor, {
                value: investmentAmount,
                from: investor
            }).should.be.fulfilled;

            (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
            let proceeds_wallet_after_balance = (await web3.fromWei(web3.eth.getBalance(wallet), "ether"));
            proceeds_wallet_after_balance.should.be.bignumber.equal(proceeds_wallet_prior_balance.plus(10000))
        })

        it('should not work for 100000 ether purchase because it is over the cap', async function () {
            const investmentAmount = ether(100000);
            const expectedTokenAmount = PHASE_1_RATE.mul(investmentAmount);

            await increaseTimeTo(this.startTime);
            await this.crowdsale.buyTokens(investor, {
                value: investmentAmount,
                from: investor
            }).should.be.rejectedWith(EVMThrow);
            let proceeds_wallet_after_balance = (await web3.fromWei(web3.eth.getBalance(wallet), "ether"));
            proceeds_wallet_after_balance.should.be.bignumber.equal(proceeds_wallet_prior_balance)
        })

        it('should work if called twice by different buyers', async function () {
            const investmentAmount = ether(1);
            const expectedTokenAmount = PHASE_1_RATE.mul(investmentAmount);

            await increaseTimeTo(this.startTime);
            await this.crowdsale.buyTokens(investor, {
                value: investmentAmount,
                from: investor
            }).should.be.fulfilled;

            await this.crowdsale.buyTokens(investor2, {
                value: investmentAmount,
                from: investor2
            }).should.be.fulfilled;

            (await this.token.balanceOf(investor)).should.be.bignumber.equal(expectedTokenAmount);
            (await this.token.balanceOf(investor2)).should.be.bignumber.equal(expectedTokenAmount);
            let proceeds_wallet_after_balance = (await web3.fromWei(web3.eth.getBalance(wallet), "ether"));
            proceeds_wallet_after_balance.should.be.bignumber.equal(proceeds_wallet_prior_balance.plus(2))
        })
    })

    describe('retrieveRemainingCoinsPostSale', async function () {
        let crowdsaleWalletTokenBalancePrior, futureWalletTokenBalancePrior;
        beforeEach('setup crowdsale', async function () {
            const investmentAmount = ether(1);
            const expectedTokenAmount = PHASE_1_RATE.mul(investmentAmount);

            await increaseTimeTo(this.startTime);
            await this.crowdsale.buyTokens(investor, {
                value: investmentAmount,
                from: investor
            }).should.be.fulfilled;

            crowdsaleWalletTokenBalancePrior = await this.token.balanceOf(this.crowdsale.address)
            futureWalletTokenBalancePrior = await this.token.balanceOf(future_wallet)
        })
        it('should only be usable by owner', async function () {
            await increaseTimeTo(this.postsale_start);
            await this.crowdsale.retrieveRemainingCoinsPostSale({
                from: investor
            }).should.be.rejectedWith(EVMThrow);

            let crowdsaleWalletTokenBalanceAfter = await this.token.balanceOf(this.crowdsale.address);
            crowdsaleWalletTokenBalanceAfter.should.be.bignumber.equal(crowdsaleWalletTokenBalancePrior);
            
            await this.crowdsale.retrieveRemainingCoinsPostSale()
                .should.be.fulfilled;

            crowdsaleWalletTokenBalanceAfter = await this.token.balanceOf(this.crowdsale.address);
            crowdsaleWalletTokenBalanceAfter.should.be.bignumber.equal(0);
        })

        it('should not be usable in phase 1', async function () {
            await this.crowdsale.retrieveRemainingCoinsPostSale({
                from: investor
            }).should.be.rejectedWith(EVMThrow);

            await this.crowdsale.retrieveRemainingCoinsPostSale()
                .should.be.rejectedWith(EVMThrow);

            let crowdsaleWalletTokenBalanceAfter = await this.token.balanceOf(this.crowdsale.address);
            let futureWalletTokenBalanceAfter = await this.token.balanceOf(future_wallet);

            crowdsaleWalletTokenBalanceAfter.should.be.bignumber.equal(crowdsaleWalletTokenBalancePrior);
        })

        it('should not be usable in phase 2', async function () {
            await increaseTimeTo(this.phase_2_start);

            await this.crowdsale.retrieveRemainingCoinsPostSale({
                from: investor
            }).should.be.rejectedWith(EVMThrow);

            await this.crowdsale.retrieveRemainingCoinsPostSale()
                .should.be.rejectedWith(EVMThrow);

            let crowdsaleWalletTokenBalanceAfter = await this.token.balanceOf(this.crowdsale.address);
            let futureWalletTokenBalanceAfter = await this.token.balanceOf(future_wallet);

            crowdsaleWalletTokenBalanceAfter.should.be.bignumber.equal(crowdsaleWalletTokenBalancePrior);
        })

        it('should not be usable in phase 3', async function () {
            await increaseTimeTo(this.phase_3_start);

            await this.crowdsale.retrieveRemainingCoinsPostSale({
                from: investor
            }).should.be.rejectedWith(EVMThrow);

            await this.crowdsale.retrieveRemainingCoinsPostSale()
                .should.be.rejectedWith(EVMThrow);
            let crowdsaleWalletTokenBalanceAfter = await this.token.balanceOf(this.crowdsale.address);
            let futureWalletTokenBalanceAfter = await this.token.balanceOf(future_wallet);

            crowdsaleWalletTokenBalanceAfter.should.be.bignumber.equal(crowdsaleWalletTokenBalancePrior);
        })

        it('should be usable post sale', async function () {
            await increaseTimeTo(this.postsale_start);

            await this.crowdsale.retrieveRemainingCoinsPostSale({
                from: investor
            }).should.be.rejectedWith(EVMThrow);

            await this.crowdsale.retrieveRemainingCoinsPostSale()
                .should.be.fulfilled;
            let futureWalletBalance = await this.token.balanceOf(future_wallet);

            let crowdsaleWalletTokenBalanceAfter = await this.token.balanceOf(this.crowdsale.address);
            let futureWalletTokenBalanceAfter = await this.token.balanceOf(future_wallet);

            let futureWalletBalanceDifference = futureWalletTokenBalanceAfter.minus(futureWalletTokenBalancePrior);

            crowdsaleWalletTokenBalanceAfter.should.be.bignumber.equal(0);
            web3.fromWei(futureWalletBalanceDifference, "ether").should.be.bignumber.equal('96998850');

        })
    })

    describe('retrieveFunds', async function () {
        it('should only be usable by owner', async function() {
            const investmentAmount = ether(100);
            const expectedTokenAmount = PHASE_1_RATE.mul(investmentAmount);

            await increaseTimeTo(this.startTime);
            await this.crowdsale.buyTokens(investor, {
                value: investmentAmount,
                from: investor
            }).should.be.fulfilled;

            await increaseTimeTo(this.postsale_start);
            await this.crowdsale.setCurrentStage();

            let current_stage = await this.crowdsale.currentStage();
            current_stage.should.be.bignumber.equal(6);

            await this.crowdsale.retrieveFunds({
                from: investor
            }).should.be.rejectedWith(EVMThrow);

            await this.crowdsale.retrieveFunds({
                from: owner
            })

        })
    })
});