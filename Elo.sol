// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Elo {
    struct EloDetails {
        int256 eloScore;
        uint256 matches;
    }

    mapping(uint256 => EloDetails) public eloData;
    uint256[] private allIdentifiers;  // Array to store all unique identifiers

    event EloUpdated(uint256 identifier, int256 newEloScore, uint256 matches);

    // Function to vote and update scores
    function vote(uint256 identifier, uint256 opponentIdentifier, bool identifierWon) public {
        if (eloData[identifier].matches == 0) {
            allIdentifiers.push(identifier);  // Add new player if first match
        }
        if (eloData[opponentIdentifier].matches == 0) {
            allIdentifiers.push(opponentIdentifier);  // Add new player if first match
        }

        EloDetails storage idElo = eloData[identifier];
        EloDetails storage opponentElo = eloData[opponentIdentifier];

        // Initialize if first time
        if (idElo.matches == 0) {
            idElo.eloScore = 1000;  // Default starting score
        }
        if (opponentElo.matches == 0) {
            opponentElo.eloScore = 1000;  // Default starting score
        }

        updateEloScores(idElo, opponentElo, identifierWon);
        
        emit EloUpdated(identifier, idElo.eloScore, idElo.matches);
        emit EloUpdated(opponentIdentifier, opponentElo.eloScore, opponentElo.matches);
    }

    // Internal function to update Elo scores
    function updateEloScores(EloDetails storage idElo, EloDetails storage opponentElo, bool identifierWon) internal {
        int256 k = 32;  // Constant K-factor for simplicity
        int256 expectedScoreId = eloCalculation(idElo.eloScore, opponentElo.eloScore);
        int256 expectedScoreOpponent = 100000 - expectedScoreId;
        int256 actualScoreId = identifierWon ? int256(100000) : int256(0);
        int256 actualScoreOpponent = 100000 - actualScoreId;
        int256 scoreChangeId = k * (actualScoreId - expectedScoreId) / 100000;
        int256 scoreChangeOpponent = k * (actualScoreOpponent - expectedScoreOpponent) / 100000;

        idElo.eloScore += scoreChangeId;
        opponentElo.eloScore += scoreChangeOpponent;
        idElo.matches += 1;
        opponentElo.matches += 1;
    }

    // Function to calculate expected Elo score
    function eloCalculation(int256 eloA, int256 eloB) internal pure returns (int256) {
        int256 exponent = (eloB - eloA) / 400;
        int256 power = exponentiate(10, abs(exponent));
        return 100000 / (1 + power);  // Scaling to maintain precision
    }

    // Helper function to perform exponentiation
    function exponentiate(int256 base, int256 exponent) internal pure returns (int256) {
        int256 result = 1;
        for (int256 i = 0; i < exponent; i++) {
            result *= base;
        }
        return result;
    }

    // Helper function to calculate absolute value
    function abs(int256 x) internal pure returns (int256) {
        return x >= 0 ? x : -x;
    }

    // Public view function to get all players with at least one match
    function getActivePlayers() public view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allIdentifiers.length; i++) {
            if (eloData[allIdentifiers[i]].matches > 0) {
                count++;
            }
        }

        uint256[] memory activePlayers = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allIdentifiers.length; i++) {
            if (eloData[allIdentifiers[i]].matches > 0) {
                activePlayers[index] = allIdentifiers[i];
                index++;
            }
        }

        return activePlayers;
    }
}
