// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PinBoard
/// @notice Public on-chain registry for pinning the most popular smart contracts on BOT Chain.
contract PinBoard {
    struct Pin {
        address target;
        string name;
        string note;
        uint32 totalPins;
        uint64 firstAt;
    }

    mapping(address => Pin) public pins;
    address[] public pinned;
    mapping(uint32 => mapping(address => uint32)) public weekPins;
    mapping(address => mapping(address => uint32)) public lastPinWeek;
    address public curator;
    mapping(address => bool) public isHidden;

    event Pinned(address indexed target, address indexed by, uint32 indexed week);

    modifier onlyCurator() {
        require(msg.sender == curator, "Not curator");
        _;
    }

    constructor() {
        curator = msg.sender;
    }

    function currentWeek() public view returns (uint32) {
        return uint32(block.timestamp / 1 weeks);
    }

    function pin(address target, string memory name, string memory note) external {
        require(target.code.length > 0, "Target must be a contract");
        uint32 thisWeek = currentWeek();
        require(lastPinWeek[msg.sender][target] < thisWeek, "Already pinned this week");
        lastPinWeek[msg.sender][target] = thisWeek;

        if (pins[target].target == address(0)) {
            require(bytes(name).length <= 32, "Name too long");
            require(bytes(note).length <= 80, "Note too long");
            pins[target] = Pin({
                target: target,
                name: name,
                note: note,
                totalPins: 1,
                firstAt: uint64(block.timestamp)
            });
            pinned.push(target);
        } else {
            pins[target].totalPins += 1;
        }
        weekPins[thisWeek][target] += 1;
        emit Pinned(target, msg.sender, thisWeek);
    }

    function setHidden(address target, bool hidden) external onlyCurator {
        isHidden[target] = hidden;
    }

    function total() external view returns (uint256) {
        return pinned.length;
    }

    function getPins(uint256 from, uint256 count) external view returns (Pin[] memory result) {
        uint256 totalCount = pinned.length;
        if (from >= totalCount) return new Pin[](0);
        uint256 to = from + count;
        if (to > totalCount) to = totalCount;
        uint256 size = to - from;
        result = new Pin[](size);
        for (uint256 i = 0; i < size; i++) {
            result[i] = pins[pinned[from + i]];
        }
    }

    function weekPinsOf(uint32 week, address target) external view returns (uint32) {
        return weekPins[week][target];
    }
}
