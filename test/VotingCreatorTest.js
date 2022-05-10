const { expect } = require("chai").use(require("chai-as-promised"));
const { ethers } = require("hardhat");


describe("VotingCreator", function() {
  let voterAccounts;
  let votingCreator;

  beforeEach(async function() {
    voterAccounts = await ethers.getSigners();

    const VotingCreator = await ethers.getContractFactory("VotingCreator", voterAccounts[0]);
    votingCreator = await VotingCreator.deploy();
    await votingCreator.deployed();
  })

  it("should be deployed", async function() {
    expect(votingCreator.address).to.be.properAddress;
  })

  it("should have 0 ether by default", async function() {
    expect(await votingCreator.getBalance()).to.equal(ethers.utils.parseEther('0.000'));
  })

  it("check voting's function", async function() {
    
    const name1 = "voting_test_1";
    const candidate0 = voterAccounts[2];
    const candidate1 = voterAccounts[3];
    const candidate2 = voterAccounts[4];
    const candidate3 = voterAccounts[5];
    const candidate4 = voterAccounts[6];


    //add first voting
    await votingCreator.addVoting(name1, [
      candidate0.address,
      candidate1.address,
      candidate2.address,
      candidate3.address,
      candidate4.address
    ], 4);
   
    expect(await votingCreator.isVotingActive(name1)).to.equal(true);

    expect(await votingCreator.getCandidatesNumber(name1)).to.equal(5);

    expect(await votingCreator.getVotersNumber(name1)).to.equal(0);

    expect(await votingCreator.getVotingBalance(name1)).to.equal(0);


    //add second voting
    const name2 = "voting_test_2";
    await votingCreator.addVoting(name2, [
      candidate0.address,
      candidate1.address,
      candidate2.address,
      candidate3.address,
    ], 1);

    expect(await votingCreator.isVotingActive(name2)).to.equal(true);

    expect(await votingCreator.getCandidatesNumber(name2)).to.equal(4);

    expect(await votingCreator.getVotersNumber(name2)).to.equal(0);

    expect(await votingCreator.getVotingBalance(name2)).to.equal(0);


    expect(await votingCreator.getVotingsNumber()).to.equal(2);


    //first voter votes in first voting
    const voter1 = voterAccounts[0];
    const voter2 = voterAccounts[1];

    const tx1 = await votingCreator.vote(name1, candidate0.address, { value: ethers.utils.parseEther('0.01') });
    await tx1.wait();

    expect(await votingCreator.getVotersNumber(name1)).to.equal(1);
    expect(await votingCreator.getVotingBalance(name1)).to.equal(ethers.utils.parseEther('0.01'));
    await expect(() => tx1).to.changeEtherBalances([voter1, votingCreator], [ethers.utils.parseEther('-0.01').toString(), ethers.utils.parseEther('0.01').toString()]);


    //second voter votes in first voting
    const tx2 = await votingCreator.connect(voter2).vote(name1, candidate1.address, { value: ethers.utils.parseEther('0.4') });
    await tx2.wait();

    expect(await votingCreator.getVotersNumber(name1)).to.equal(2);
    expect(await votingCreator.getVotingBalance(name1)).to.equal(ethers.utils.parseEther('0.02'));
    await expect(() => tx2).to.changeEtherBalances([voter2, votingCreator], [ethers.utils.parseEther('-0.01').toString(), ethers.utils.parseEther('0.01').toString()]);

    function timeout(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    await timeout(4000);


    //finish first voting
    const tx3 = await votingCreator.finish(name1);
    await tx3.wait();

    expect(await votingCreator.isVotingActive(name1)).to.equal(false);
    expect(await votingCreator.getVotingBalance(name1)).to.equal(ethers.utils.parseEther('0.002'));

    await expect(() => tx3).to.changeEtherBalances([votingCreator, candidate0], [ethers.utils.parseEther('-0.018').toString(), ethers.utils.parseEther('0.009').toString()]);
    await expect(() => tx3).to.changeEtherBalances([votingCreator, candidate1], [ethers.utils.parseEther('-0.018').toString(), ethers.utils.parseEther('0.009').toString()]);


    //withdraw commission
    const owner = voterAccounts[0];

    const tx4 = await votingCreator.withdrawCommission();
    await tx4.wait();

    expect(await votingCreator.getVotingBalance(name1)).to.equal(ethers.utils.parseEther('0.000'));

    await expect(() => tx4).to.changeEtherBalances([votingCreator, owner], [ethers.utils.parseEther('-0.002'), ethers.utils.parseEther('0.002')]);

  })

  it("check special case with rounding", async function() {
    
    const name1 = "voting_test_1";
    const candidate0 = voterAccounts[0];
    const candidate1 = voterAccounts[1];
    const candidate2 = voterAccounts[2];
    const candidate3 = voterAccounts[3];
    const candidate4 = voterAccounts[4];
    const candidate5 = voterAccounts[5];
    const candidate6 = voterAccounts[6];
    const candidate7 = voterAccounts[7];


    //add voting
    await votingCreator.addVoting(name1, [
      candidate0.address,
      candidate1.address,
      candidate2.address,
      candidate3.address,
      candidate4.address,
      candidate5.address,
      candidate6.address,
      candidate7.address
    ], 17);
   
    expect(await votingCreator.isVotingActive(name1)).to.equal(true);

    expect(await votingCreator.getCandidatesNumber(name1)).to.equal(8);

    expect(await votingCreator.getVotersNumber(name1)).to.equal(0);

    expect(await votingCreator.getVotingBalance(name1)).to.equal(0);


    expect(await votingCreator.getVotingsNumber()).to.equal(1);


    //all voters vote in voting
    for(let i = 0; i < 7; ++i) {

      const tx1 = await votingCreator.connect(voterAccounts[i * 2]).vote(name1, voterAccounts[i].address, { value: ethers.utils.parseEther('0.01') });
      await tx1.wait();

      const tx2 = await votingCreator.connect(voterAccounts[i * 2 + 1]).vote(name1, voterAccounts[i].address, { value: ethers.utils.parseEther('0.05') });
      await tx2.wait();
  
      expect(await votingCreator.getVotersNumber(name1)).to.equal(i * 2 + 2);
      expect(await votingCreator.getVotingBalance(name1)).to.equal(ethers.utils.parseEther('0.01').mul(i * 2 + 2));
      await expect(() => tx1).to.changeEtherBalances([voterAccounts[i * 2], votingCreator], [ethers.utils.parseEther('-0.01').toString(), ethers.utils.parseEther('0.01').toString()]);
      await expect(() => tx2).to.changeEtherBalances([voterAccounts[i * 2 + 1], votingCreator], [ethers.utils.parseEther('-0.01').toString(), ethers.utils.parseEther('0.01').toString()]);
    }

    const tx = await votingCreator.connect(voterAccounts[14]).vote(name1, voterAccounts[7].address, { value: ethers.utils.parseEther('0.01') });
    await tx.wait();

    expect(await votingCreator.getVotersNumber(name1)).to.equal(15);
    expect(await votingCreator.getVotingBalance(name1)).to.equal(ethers.utils.parseEther('0.15'));
    await expect(() => tx).to.changeEtherBalances([voterAccounts[14], votingCreator], [ethers.utils.parseEther('-0.01').toString(), ethers.utils.parseEther('0.01').toString()]);

    function timeout(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    await timeout(10000);


    //finish first voting
    const tx8 = await votingCreator.finish(name1);
    await tx8.wait();

    expect(await votingCreator.isVotingActive(name1)).to.equal(false);

    const prize = ethers.utils.parseEther('0.15').mul(9).div(10).div(7);
    const prizes = prize.mul(7);
    const remains = ethers.utils.parseEther('0.15').sub(prizes);

    expect(await votingCreator.getVotingBalance(name1)).to.equal(remains);

    await expect(() => tx8).to.changeEtherBalances([votingCreator, voterAccounts[0]], [prizes.mul(-1).toString(), prize.toString()]);


    //withdraw commission
    const owner = voterAccounts[0];

    const tx9 = await votingCreator.withdrawCommission();
    await tx9.wait();

    expect(await votingCreator.getVotingBalance(name1)).to.equal(ethers.utils.parseEther('0.000'));

    await expect(() => tx9).to.changeEtherBalances([votingCreator, owner], [remains.mul(-1), remains]);
  })

  it("check onlyOwner addVoting function", async function() {
    const name1 = "voting_test_1";
    const candidate0 = voterAccounts[2];
    const candidate1 = voterAccounts[3];

    await expect(votingCreator.connect(voterAccounts[1]).addVoting(name1, [
      candidate0.address,
      candidate1.address,
    ], 1)).to.be.rejectedWith("you are not an owner!");
  })

  it("check onlyOwner withdrawCommission function", async function() {
    await expect(votingCreator.connect(voterAccounts[1]).withdrawCommission()).to.be.rejectedWith("you are not an owner!");
  })
   
  it("check vote function", async function() {
    const name1 = "voting_test_1";
    const name2 = "voting_test_2";
    const candidate0 = voterAccounts[0];
    const candidate1 = voterAccounts[1];
    const candidate2 = voterAccounts[2];
    const candidate3 = voterAccounts[3];
    const candidate4 = voterAccounts[4];

    await expect(votingCreator.vote(name1, candidate0.address, { value: ethers.utils.parseEther('0.01') }))
    .to.be.rejectedWith("this voting is inactive");


    await votingCreator.addVoting(name1, [
      candidate0.address,
      candidate1.address,
      candidate2.address,
      candidate3.address
    ], 1);

    await expect(votingCreator.vote(name1, candidate0.address, { value: ethers.utils.parseEther('0.01') }))
    .to.be.rejectedWith("voting time has finished");


    await votingCreator.finish(name1);

    await expect(votingCreator.vote(name1, candidate0.address, { value: ethers.utils.parseEther('0.01') }))
    .to.be.rejectedWith("this voting is inactive");


    await votingCreator.addVoting(name2, [
      candidate0.address,
      candidate1.address,
      candidate2.address,
      candidate3.address
    ], 10);

    await votingCreator.vote(name2, candidate0.address, { value: ethers.utils.parseEther('0.01') });

    await expect(votingCreator.vote(name2, candidate1.address, { value: ethers.utils.parseEther('0.01') }))
    .to.be.rejectedWith("this user has already voted");

    await expect(votingCreator.connect(voterAccounts[1]).vote(name2, candidate2.address, { value: ethers.utils.parseEther('0.001') }))
    .to.be.rejectedWith("not enough money to vote");

    await expect(votingCreator.connect(voterAccounts[1]).vote(name2, candidate4.address, { value: ethers.utils.parseEther('0.01') }))
    .to.be.rejectedWith("not exist that candidate in this voting");
  })

  it("check finish function", async function() {
    const name1 = "voting_test_1";
    const candidate0 = voterAccounts[0];
    const candidate1 = voterAccounts[1];
    const candidate2 = voterAccounts[2];
    const candidate3 = voterAccounts[3];

    await expect(votingCreator.finish(name1)).to.be.rejectedWith("this voting is inactive");


    await votingCreator.addVoting(name1, [
      candidate0.address,
      candidate1.address,
      candidate2.address,
      candidate3.address
    ], 3);

    await expect(votingCreator.finish(name1)).to.be.rejectedWith("voting time hasn't finished");

    function timeout(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    await timeout(3000);


    await votingCreator.finish(name1);

    await expect(votingCreator.finish(name1)).to.be.rejectedWith("this voting is inactive");
  })

  it("check show functions", async function() {
    const name0 = "voting_test_0";
    const name1 = "voting_test_1";
    const candidate0 = voterAccounts[0];
    const candidate1 = voterAccounts[1];
    const candidate2 = voterAccounts[2];

    await votingCreator.showCandidates(name1);
    await votingCreator.showResults(name1);

    await votingCreator.addVoting(name0, [], 1);

    await votingCreator.showCandidates(name0);
    await votingCreator.showResults(name0);

    await votingCreator.addVoting(name1, [
      candidate0.address,
      candidate1.address,
      candidate2.address,
    ], 5);

    await votingCreator.showCandidates(name1);
    await votingCreator.showResults(name1);

    await votingCreator.vote(name1, candidate0.address, { value: ethers.utils.parseEther('0.01') });
    await votingCreator.connect(voterAccounts[1]).vote(name1, candidate1.address, { value: ethers.utils.parseEther('0.01') });
    await votingCreator.connect(voterAccounts[2]).vote(name1, candidate0.address, { value: ethers.utils.parseEther('0.01') });

    await votingCreator.showResults(name1);

    function timeout(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    await timeout(5000);

    await votingCreator.finish(name1);

    await votingCreator.showResults(name1);


  })

})
