// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract VotingCreator {
    
    address owner;

    struct Rating {
        uint rating;
        bool candidate;
    }

    struct Voting {
        mapping(address => Rating) voteRating;

        mapping(uint => address) candidatesList;
        uint candidatesNumber;

        mapping(address => bool) votedVoters;
        uint votedVotersNumber;

        uint startTimestamp;
        uint balance;
        bool active;

        uint votingPeriod;
    }

    mapping (string => Voting) votings;
    mapping (uint => string) votingsList;
    uint votingsNumber;

    modifier onlyOwner() {
        require(msg.sender == owner, "you are not an owner!");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addVoting(string memory _name, address[] memory _candidates, uint _votingPeriod) public onlyOwner {

        votingsList[votingsNumber] = _name;
        ++votingsNumber;
        
        Voting storage currentVoting = votings[_name];
        currentVoting.candidatesNumber = _candidates.length;
        currentVoting.votingPeriod = _votingPeriod;

        for(uint iCandidate = 0; iCandidate < _candidates.length; ++iCandidate) {
            currentVoting.voteRating[_candidates[iCandidate]].candidate = true;
            currentVoting.candidatesList[iCandidate] = _candidates[iCandidate];
        }
        currentVoting.startTimestamp = block.timestamp;
        currentVoting.active = true;
    }

    function vote(string memory _name, address _candidate) external payable {

        Voting storage currentVoting = votings[_name];

        require(currentVoting.active, "this voting is inactive");

        require(block.timestamp - currentVoting.startTimestamp < currentVoting.votingPeriod, "voting time has finished");

        require(!currentVoting.votedVoters[msg.sender], "this user has already voted");

        require(msg.value >= 0.01 ether, "not enough money to vote");

        require(currentVoting.voteRating[_candidate].candidate, "not exist that candidate in this voting");

        ++currentVoting.voteRating[_candidate].rating;
        currentVoting.votedVoters[msg.sender] = true;
        ++currentVoting.votedVotersNumber;

        
        if(msg.value > 0.01 ether) {
            address payable _to = payable(msg.sender);
            _to.transfer(msg.value - 0.01 ether);
        }

        currentVoting.balance += 0.01 ether;
    }

    function finish(string memory _name) external {

        Voting storage currentVoting = votings[_name];

        require(currentVoting.active, "this voting is inactive");

        require(block.timestamp - currentVoting.startTimestamp >= currentVoting.votingPeriod, "voting time hasn't finished");

        currentVoting.active = false;

        uint winnersNumber;
        uint maxRating;

        uint currentRating;

        for(uint i = 0; i < currentVoting.candidatesNumber; ++i) {
            currentRating = currentVoting.voteRating[currentVoting.candidatesList[i]].rating;

            if(currentRating > maxRating) {
                maxRating = currentRating;
            }
        }

        if(maxRating <= 0) {
            console.log("there's not winners because nobody hasn't voted");
        }
        else {
            for(uint i = 0; i < currentVoting.candidatesNumber; ++i) {
                if(currentVoting.voteRating[currentVoting.candidatesList[i]].rating == maxRating) {
                    ++winnersNumber;
                }
            }

            uint prize = currentVoting.balance * 9 / 10 / winnersNumber;

            for(uint i = 0; i < currentVoting.candidatesNumber; ++i) {
                if(currentVoting.voteRating[currentVoting.candidatesList[i]].rating == maxRating) {
                    payable(currentVoting.candidatesList[i]).transfer(prize);
                    currentVoting.balance -= prize;
                }
            }
        }
    }

    function withdrawCommission() external onlyOwner {

        address payable _to = payable(owner);

        uint sumCommission;

        for(uint i = 0; i < votingsNumber; ++i) {
            if(!votings[votingsList[i]].active) {
                sumCommission += votings[votingsList[i]].balance;
                votings[votingsList[i]].balance = 0;
            }
        }

        _to.transfer(sumCommission);
    }

    function getBalance() external view onlyOwner returns (uint) {
        return address(this).balance;
    }

    function isVotingActive(string memory _name) external view onlyOwner returns (bool) {
        return votings[_name].active;
    }

    function getCandidatesNumber(string memory _name) external view onlyOwner returns (uint) {
        return votings[_name].candidatesNumber;
    }

    function getVotersNumber(string memory _name) external view onlyOwner returns (uint) {
        return votings[_name].votedVotersNumber;
    }

    function getVotingsNumber() external view onlyOwner returns (uint) {
        return votingsNumber;
    }

    function getVotingBalance(string memory _name) external view onlyOwner returns (uint) {
        return votings[_name].balance;
    }

    //view

    function showCandidates(string memory _name) external view {

        console.log("Voting's name is", _name);

        Voting storage currentVoting = votings[_name];

        if(currentVoting.startTimestamp == 0) {
            console.log("Voting hasn't started");
        }
        else {
            if(currentVoting.candidatesNumber == 0) {
                console.log("There're not candidates");
            }
            else {
                console.log("");

                for(uint i = 0; i < currentVoting.candidatesNumber; ++i) {
                    console.log(i + 1, currentVoting.candidatesList[i]);
                }
            }
        }

        console.log("");
        console.log("");
    }

    function showResults(string memory _name) external view {

        console.log("Voting's name is", _name);

        Voting storage currentVoting = votings[_name];

        if(currentVoting.active) {
            console.log("Voting is active");
        }
        else if (currentVoting.startTimestamp == 0) {
            console.log("Voting hasn't started");
        }
        else {
            console.log("Voting has finished");
        }

        console.log("");

        for(uint i = 0; i < currentVoting.candidatesNumber; ++i) {
            console.log(i + 1, currentVoting.candidatesList[i], currentVoting.voteRating[currentVoting.candidatesList[i]].rating);
        }

        console.log("");
        console.log("");
    }
}
