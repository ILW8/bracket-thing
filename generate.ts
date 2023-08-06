// naive re-implementation of python script


/*

import networkx as nx
import matplotlib.pyplot as plt
from networkx.drawing.nx_pydot import graphviz_layout

g = nx.DiGraph()
playerarr = [i for i in range(1, 31)]
winner_bracket = []
loser_bracket = []
loser_matrix = [[2], [4, 3]]

*/
const PLAYER_COUNT = 19;

let players: number[] = [...Array(PLAYER_COUNT).keys()].map(playerID => playerID + 1);

// contains node IDs
let nodesMap: { [key: number]: MatchNode } = {};
let nodeDegrees: { [key: number]: number } = {};

let allNodes: MatchNode[] = [];
let winnerBracketNodes: MatchNode[] = [];
let loserBracketNodes: MatchNode[] = [];
let losersMatrix: number[][] = [[2], [4, 3]];  // must initially be seeded with [[2], [4, 3]]


// g.add_node(node_id, players=pl, is_winner=w)
/**
 * these nodes are meant for use in a directed graph
 */
class MatchNode {
    public parent: MatchNode = null;

    constructor(public ID: number, public players: number[], public isWinner: boolean) {
    }

    public static makeDirectedEdge(parentNodeID: number, childNodeID: number) {  // for readability purposes
        // childNode.parent = parentNode;
        nodesMap[childNodeID].parent = nodesMap[parentNodeID];
        nodeDegrees[childNodeID] = (nodeDegrees[childNodeID] ?? 0) + 1;
        nodeDegrees[parentNodeID] = (nodeDegrees[parentNodeID] ?? 0) + 1;
    }


}

function makeNode(players: number[], isWinner: boolean) {
    const newNodeID = allNodes.length + 1;
    console.log(newNodeID, players, isWinner);
    const newNode = new MatchNode(newNodeID, players, isWinner);

    (isWinner ? winnerBracketNodes : loserBracketNodes).push(newNode)
    allNodes.push(newNode);
    nodesMap[newNodeID] = newNode;

    return newNodeID;
}


// # create an initial bracket, assuming 4 players and then hide as needed, DONT change the order of creation!
// def init_finals():
//     a = create_node([1, 2], True)
//     b = create_node([1, 2], True)
//     g.add_edge(b, a)
//
//     b = create_node([2, 3], False)  # c
//     g.add_edge(b, a)
//     g.add_edge(2, b)
//
//     a = create_node([3, 4], False)  # d
//     g.add_edge(a, b)  # d, c
//
//     b = create_node([1, 4], True)  # e
//     g.add_edge(b, 2)  # e, b
//
//     b = create_node([2, 3], True)  # f
//     g.add_edge(b, 2)  # f, b

// make the root of the tree (start with finals)
function createTreeRoot() {
    // wtf do these letters mean? wtf is a b c d e f????
    const a = makeNode([1, 2], true);
    const b = makeNode([1, 2], true);
    MatchNode.makeDirectedEdge(a, b);

    const c = makeNode([2, 3], false);
    MatchNode.makeDirectedEdge(c, a);
    MatchNode.makeDirectedEdge(b, c);

    const d = makeNode([3, 4], false);
    MatchNode.makeDirectedEdge(d, c);

    const e = makeNode([1, 4], true);
    MatchNode.makeDirectedEdge(e, b);

    const f = makeNode([2, 3], true);
    MatchNode.makeDirectedEdge(f, b);
}


// def filter_nodes(max_player):  # remove all nodes which contain players above a certain maximum player
//     delete_list = []
//     for node in g.nodes:
//         for player in g.nodes[node]["players"]:
//             if player > max_player:
//                 delete_list.append(node)
//     g.remove_nodes_from(delete_list)
/**
 *
 * @param maxSeed maximum seed to include (inclusive)
 */
function filterBySeed(maxSeed: number) {
    // for (const a of allNodes) {
    //     console.log(a);
    //     if (a.players.some(playerSeed => playerSeed > maxSeed)) {
    //
    //     }
    // }
    const deleteList: number[] = [];
    for (let idx = 0; idx > allNodes.length; idx++) {
        for (const playerSeed of allNodes[idx].players) {
            if (playerSeed > maxSeed) {
                deleteList.push(playerSeed);
                break;
            }
        }
        // if (allNodes[idx].players.some(playerSeed => playerSeed > maxSeed)) {
        //     deleteList.push(idx);
        // }
    }

    for (const toDelete of deleteList) {
        allNodes.splice(toDelete, 1); // remove element in-place

        // remove edge to this node
        for (const node of allNodes) {
            if (node.parent == nodesMap[toDelete]) {
                node.parent = null;
            }
        }

        delete nodesMap[toDelete]; // remove from mapping
    }
}


// def create_winners(max_player):  # create the winners brackets
//     global winner_bracket, loser_matrix
//     exp = 2
//     current_limit = 4
//     while current_limit < max_player:
//         exp = exp + 1
//         current_limit = 2 ** exp
//         active_players = [i for i in range(1, current_limit + 1)]
//         a = active_players[:len(active_players) // 2]
//         b = active_players[len(active_players) // 2:]
//         b.reverse()
//         match_pairings = list(zip(a, b))
//         latest_depth_list = winner_bracket[current_limit // 2 // 2 * -1:]  # this way we only index winners
//         loser_subarr = []
//         for node_id in latest_depth_list:
//             for match in match_pairings:
//                 if any(x in list(match) for x in g.nodes[node_id]["players"]):  # if they share any members, add an edge
//                     loser_subarr.append(match[1])
//                     id = create_node(list(match), True)
//                     g.add_edge(id, node_id)
//
//         loser_matrix.append(loser_subarr)

function zip<TypeLeft, TypeRight>(left: TypeLeft[], right: TypeRight[]) {
    return left.map((element, idx) => [element, right[idx]]);
}

function intDiv(numerator: number, denominator: number): number {
    return Math.floor(numerator / denominator);
}

/**
 * Builds the winner bracket
 * @param playerCount how many players/teams in the bracket
 */
function buildWinners(playerCount: number) {
    let exponent = 2;
    let currentLimit = 4;

    while (currentLimit < playerCount) {
        exponent++;
        currentLimit = Math.pow(2, exponent);
        let activePlayers = [...Array(currentLimit).keys()].map(n => n + 1);

        let firstHalfPlayers = activePlayers.slice(0, Math.floor(activePlayers.length / 2));
        let secondHalfPlayers = activePlayers.slice(Math.floor(activePlayers.length / 2));
        secondHalfPlayers.reverse();

        let matchPairings = zip<number, number>(firstHalfPlayers, secondHalfPlayers);
        let latestDepthList = winnerBracketNodes.slice(intDiv(intDiv(currentLimit, 2), 2) * -1)
        let loserSubArray: number[] = []; // what are these names

        // UGLYYYY
        for (const node of latestDepthList) {
            for (const match of matchPairings) {
                for (const player of node.players) {
                    if (match.includes(player)) {
                        loserSubArray.push(match[1]);
                        let id = makeNode(match, true);
                        MatchNode.makeDirectedEdge(id, node.ID);
                    }
                }
            }
        }

        losersMatrix.push(loserSubArray);
    }


}

// def find_first_occ(player, bracket):  # wtf is occ?
//     for id in bracket:
//         try:
//             if player in g.nodes[id]["players"]:
//                 return id
//         except:  # WTF IS THIS
//             continue

// assuming this is guaranteed to return something?
function findFirstOcc(playerID: number, bracket: MatchNode[]): number {
    for (const match of bracket) {
        if (match.players.includes(playerID)) {
            return match.ID;
        }
    }
}


// def link_stragglers():
//     for node in g.nodes:
//         if not g.nodes[node]["is_winner"] and g.degree[node] < 3:
//             if g.degree[node] == 2:
//                 g.add_edge(find_first_occ(g.nodes[node]["players"][1], winner_bracket), node)
//             elif g.degree[node] == 1:
//                 g.add_edge(find_first_occ(g.nodes[node]["players"][0], winner_bracket), node)
//                 g.add_edge(find_first_occ(g.nodes[node]["players"][1], winner_bracket), node)

function linkStragglers() {
    for (const node of allNodes) {
        if (node.isWinner && nodeDegrees[node.ID] < 3) {
            if (nodeDegrees[node.ID] == 1)
                MatchNode.makeDirectedEdge(findFirstOcc(node.players[0], winnerBracketNodes), node.ID);

            MatchNode.makeDirectedEdge(findFirstOcc(node.players[1], winnerBracketNodes), node.ID);

        }
    }
}


// def make_cont_match(pairings, new_n, limit, max_p, bracket, e):
//     # continued section from previous loser matches
//     pairings[0].reverse()
//     players = pairings.pop(0)
//     cont_node = create_node(players, False)
//     g.add_edge(cont_node, new_n)
//     if limit >= max_p:  # if this is the final bracket limit
//         linking_winner_matches = []
//         for player in players:
//             linking_winner_matches.append(find_first_occ(player, bracket))
//         for link in linking_winner_matches:
//             g.add_edge(link, cont_node)

function makeContMatch(pairings: number[][], newNode: number, limit: number, maxPlayers: number, bracket: MatchNode[]) {
    pairings[0].reverse();
    players = pairings.shift();
    let contNodeID = makeNode(players, false);
    MatchNode.makeDirectedEdge(contNodeID, newNode);

    if (limit >= maxPlayers) { // "if this is the final bracket limit"
        let linkingWinnerMatches: number[] = [];
        for (const player of players) {
            linkingWinnerMatches.push(findFirstOcc(player, bracket));
        }

        for (const link of linkingWinnerMatches) {
            MatchNode.makeDirectedEdge(link, contNodeID);
        }
    }
}


// def create_losers(max_player):
//     global loser_bracket, loser_matrix, winner_bracket
//     exp = 2
//     current_limit = 4
//     window = (0, 1)
//     swap = False
//     while current_limit < max_player:
//         exp = exp + 1
//         current_limit = 2 ** exp
//         window = (window[0] + 1, window[1] + 1)
//         match_pairings = []
//         for x in range(0, len(loser_matrix[window[1]]), 2):
//             match_pairings.append(list([loser_matrix[window[1]][x], loser_matrix[window[1]][x + 1]]))
//
//         split = len(loser_matrix[window[1]]) // 2
//         cont_winners = [min(match) for match in match_pairings]
//         if swap:
//             cont_winners.reverse()
//             match_pairings.reverse()
//         start_idx = len(loser_bracket) - (split - 1)
//         for i in range(start_idx, len(loser_bracket), 2):
//             selected_node = loser_bracket[i]
//             # do the left first
//             linking_player = min(g.nodes[selected_node]["players"])
//             carry_player = cont_winners.pop(0)
//
//             winner_node = find_first_occ(linking_player, winner_bracket)
//             new_node = create_node([linking_player, carry_player], False)
//             g.add_edge(new_node, selected_node)
//             g.add_edge(winner_node, new_node)
//
//             make_cont_match(match_pairings, new_node, current_limit, max_player, winner_bracket, exp)
//
//             # now do the right
//             linking_player = max(g.nodes[selected_node]["players"])
//             carry_player = cont_winners.pop(0)
//
//             winner_node = find_first_occ(linking_player, winner_bracket)
//             new_node = create_node([linking_player, carry_player], False)
//             g.add_edge(new_node, selected_node)
//             g.add_edge(winner_node, new_node)
//
//             make_cont_match(match_pairings, new_node, current_limit, max_player, winner_bracket, exp)
//         swap = not swap

function buildLosers(maxPlayers: number) {
    let exponent = 2;
    let currentLimit = 4;
    let window = [0, 1];
    let swap = false;

    while (currentLimit < maxPlayers) {
        exponent++;
        currentLimit = Math.pow(2, exponent);

        window = window.map(e => e + 1);

        let matchPairings: number[][] = [];
        for (let i = 0; i < losersMatrix[window[1]].length; i += 2) {
            matchPairings.push([losersMatrix[window[1]][i], losersMatrix[window[1]][i + 1]]);
        }

        let split = intDiv(losersMatrix[window[1]].length, 2);

        // expanded list comprehension
        let contWinners: number[] = [];
        for (const match of matchPairings) {
            contWinners.push(Math.min(...match));
        }

        if (swap) {
            contWinners.reverse();
            matchPairings.reverse();
        }

        let startIndex = loserBracketNodes.length - (split - 1);
        const startingLoserBracketNodesLength = loserBracketNodes.length;
        for (let i = startIndex; i < startingLoserBracketNodesLength; i += 2) {

            let selectedNode = loserBracketNodes[i];

            const linkingPlayers = [Math.min(...selectedNode.players), Math.max(...selectedNode.players)];
            for (const linkingPlayer of linkingPlayers) {
                let carryPlayer = contWinners.shift();

                let winnerNode = findFirstOcc(linkingPlayer, winnerBracketNodes);
                let newNode = makeNode([linkingPlayer, carryPlayer], false);
                MatchNode.makeDirectedEdge(newNode, selectedNode.ID);
                MatchNode.makeDirectedEdge(winnerNode, newNode);

                makeContMatch(matchPairings, newNode, currentLimit, maxPlayers, winnerBracketNodes);
            }


        }
        swap = !swap;
    }
}


createTreeRoot();
buildWinners(players.at(-1));
buildLosers(players.at(-1));
filterBySeed(players.at(-1));
linkStragglers();
