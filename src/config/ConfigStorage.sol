// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IConfigNotifiable.sol";
import "../interfaces/IConfigStorage.sol";

contract ConfigStorage is Ownable, IConfigStorage {
    mapping(bytes32 => address) private roleStorage;
    mapping(StorageKey => uint256) private uintStorage;
    mapping(bytes32 => uint256) private uintArrayStorage;
    mapping(StorageKey => uint8) private uintArrayStorageLength;
    mapping(bytes32 => uint8) private smallUintArrayStorage;
    mapping(StorageKey => uint8) private smallUintArrayStorageLength;
    mapping(StorageKey => int16) private smallIntStorage;
    mapping(bytes32 => int16) private smallIntArrayStorage;
    mapping(StorageKey => uint8) private smallIntArrayStorageLength;
    mapping(StorageKey => bool) private boolStorage;
    mapping(StorageKey => address) private addressStorage;
    mapping(bytes32 => address) private addressArrayStorage;
    mapping(StorageKey => uint8) private addressArrayStorageLength;
    mapping(StorageKey => bytes32) private bytes32Storage;
    address[] private notifiableAddresses;

    constructor() Ownable(msg.sender) {}

    function setRole(
        Role _role,
        address _contract,
        address _addr
    ) public onlyOwner {
        roleStorage[keccak256(abi.encode(_role, _contract))] = _addr;
    }

    function setUniversalRole(Role _role, address _addr) public onlyOwner {
        roleStorage[keccak256(abi.encode(_role, address(0)))] = _addr;
    }

    function getRole(Role _role) public view returns (address) {
        return getContractRole(_role, msg.sender);
    }

    function getContractRole(
        Role _role,
        address _contract
    ) public view returns (address) {
        return roleStorage[keccak256(abi.encode(_role, _contract))];
    }

    function getUniversalRole(Role _role) public view returns (address) {
        return roleStorage[keccak256(abi.encode(_role, address(0)))];
    }

    // Setter for uint
    function setUint(
        StorageKey _key,
        uint256 _value,
        bool _notify
    ) public onlyOwner {
        uintStorage[_key] = _value;
        if (_notify) notify();
    }

    // Getter for uint
    function getUint(StorageKey _key) public view returns (uint256) {
        return uintStorage[_key];
    }

    function setUintArray(
        StorageKey _key,
        uint256[] calldata _uintArray,
        bool _notify
    ) public onlyOwner {
        uint256 arrLength = _uintArray.length;
        if (arrLength > 255) revert ArrayTooLongError();

        for (uint8 i; i < arrLength; i++) {
            bytes32 encodedKey = keccak256(abi.encodePacked(_key, i));
            uintArrayStorage[encodedKey] = _uintArray[i];
        }

        // remove extra if shortening array
        if (uint8(arrLength) < uintArrayStorageLength[_key]) {
            for (
                uint8 j = uint8(arrLength);
                j < uintArrayStorageLength[_key];
                j++
            ) {
                bytes32 encodedKey = keccak256(abi.encodePacked(_key, j));
                delete uintArrayStorage[encodedKey];
            }
        }

        uintArrayStorageLength[_key] = uint8(arrLength);
        if (_notify) notify();
    }

    function getUintArray(
        StorageKey _key
    ) public view returns (uint256[] memory _uintArray) {
        uint256[] memory uintArray = new uint256[](
            uintArrayStorageLength[_key]
        );
        for (uint8 i; i < uintArrayStorageLength[_key]; i++) {
            bytes32 encodedKey = keccak256(abi.encodePacked(_key, i));
            uintArray[i] = uintArrayStorage[encodedKey];
        }
        _uintArray = uintArray;
    }

    function setSmallUintArray(
        StorageKey _key,
        uint8[] calldata _smallUintArray,
        bool _notify
    ) public onlyOwner {
        uint256 arrLength = _smallUintArray.length;
        if (arrLength > 255) revert ArrayTooLongError();

        for (uint8 i; i < arrLength; i++) {
            bytes32 encodedKey = keccak256(abi.encodePacked(_key, i));
            smallUintArrayStorage[encodedKey] = _smallUintArray[i];
        }

        // remove extra if shortening array
        if (uint8(arrLength) < smallUintArrayStorageLength[_key]) {
            for (
                uint8 j = uint8(arrLength);
                j < smallUintArrayStorageLength[_key];
                j++
            ) {
                bytes32 encodedKey = keccak256(abi.encodePacked(_key, j));
                delete smallUintArrayStorage[encodedKey];
            }
        }

        smallUintArrayStorageLength[_key] = uint8(arrLength);

        if (_notify) notify();
    }

    function getSmallUintArray(
        StorageKey _key
    ) public view returns (uint8[] memory _smallUintArray) {
        uint8[] memory smallUintArray = new uint8[](
            smallUintArrayStorageLength[_key]
        );
        for (uint8 i; i < smallUintArrayStorageLength[_key]; i++) {
            bytes32 encodedKey = keccak256(abi.encodePacked(_key, i));
            smallUintArray[i] = smallUintArrayStorage[encodedKey];
        }
        _smallUintArray = smallUintArray;
    }

    // Setter for int
    function setSmallInt(
        StorageKey _key,
        int16 _value,
        bool _notify
    ) public onlyOwner {
        smallIntStorage[_key] = _value;
        if (_notify) notify();
    }

    // Getter for int
    function getSmallInt(StorageKey _key) public view returns (int16) {
        return smallIntStorage[_key];
    }

    function setSmallIntArray(
        StorageKey _key,
        int16[] calldata _smallIntArray,
        bool _notify
    ) public onlyOwner {
        uint256 arrLength = _smallIntArray.length;
        if (arrLength > 255) revert ArrayTooLongError();

        for (uint8 i; i < arrLength; i++) {
            bytes32 encodedKey = keccak256(abi.encodePacked(_key, i));
            smallIntArrayStorage[encodedKey] = _smallIntArray[i];
        }

        // remove extra if shortening array
        if (uint8(arrLength) < smallIntArrayStorageLength[_key]) {
            for (
                uint8 j = uint8(arrLength);
                j < smallIntArrayStorageLength[_key];
                j++
            ) {
                bytes32 encodedKey = keccak256(abi.encodePacked(_key, j));
                delete smallIntArrayStorage[encodedKey];
            }
        }

        smallIntArrayStorageLength[_key] = uint8(arrLength);

        if (_notify) notify();
    }

    function getSmallIntArray(
        StorageKey _key
    ) public view returns (int16[] memory _smallIntArray) {
        int16[] memory smallIntArray = new int16[](
            smallIntArrayStorageLength[_key]
        );
        for (uint8 i; i < smallIntArrayStorageLength[_key]; i++) {
            bytes32 encodedKey = keccak256(abi.encodePacked(_key, i));
            smallIntArray[i] = smallIntArrayStorage[encodedKey];
        }
        _smallIntArray = smallIntArray;
    }

    // Setter for bool
    function setBool(
        StorageKey _key,
        bool _value,
        bool _notify
    ) public onlyOwner {
        boolStorage[_key] = _value;
        if (_notify) notify();
    }

    // Getter for bool
    function getBool(StorageKey _key) public view returns (bool) {
        return boolStorage[_key];
    }

    // Setter for address
    function setAddress(
        StorageKey _key,
        address _value,
        bool _notify
    ) public onlyOwner {
        addressStorage[_key] = _value;
        if (_notify) notify();
    }

    // Setter for multiple addresses
    function setAddresses(
        StorageKey[] calldata _keys,
        address[] calldata _values,
        bool _notify
    ) public onlyOwner {
        for (uint8 i; i < _keys.length; i++) {
            addressStorage[_keys[i]] = _values[i];
        }
        if (_notify) notify();
    }

    // Getter for address
    function getAddress(StorageKey _key) public view returns (address) {
        return addressStorage[_key];
    }

    function setAddressArray(
        StorageKey _key,
        address[] calldata _addressArray,
        bool _notify
    ) public onlyOwner {
        uint256 arrLength = _addressArray.length;
        if (arrLength > 255) revert ArrayTooLongError();

        for (uint8 i; i < arrLength; i++) {
            bytes32 encodedKey = keccak256(abi.encodePacked(_key, i));
            addressArrayStorage[encodedKey] = _addressArray[i];
        }

        // remove extra if shortening array
        if (uint8(arrLength) < addressArrayStorageLength[_key]) {
            for (
                uint8 j = uint8(arrLength);
                j < addressArrayStorageLength[_key];
                j++
            ) {
                bytes32 encodedKey = keccak256(abi.encodePacked(_key, j));
                delete addressArrayStorage[encodedKey];
            }
        }

        addressArrayStorageLength[_key] = uint8(arrLength);
        if (_notify) notify();
    }

    function getAddressArray(
        StorageKey _key
    ) public view returns (address[] memory _addressArray) {
        address[] memory addressArray = new address[](
            addressArrayStorageLength[_key]
        );
        for (uint8 i; i < addressArrayStorageLength[_key]; i++) {
            bytes32 encodedKey = keccak256(abi.encodePacked(_key, i));
            addressArray[i] = addressArrayStorage[encodedKey];
        }
        _addressArray = addressArray;
    }

    // Setter for bytes32
    function setBytes32(
        StorageKey _key,
        bytes32 _value,
        bool _notify
    ) public onlyOwner {
        bytes32Storage[_key] = _value;
        if (_notify) notify();
    }

    // Getter for bytes32
    function getBytes32(StorageKey _key) public view returns (bytes32) {
        return bytes32Storage[_key];
    }

    // Add a notifiable address
    function addNotifiableAddress(address _addr) public onlyOwner {
        notifiableAddresses.push(_addr);
    }

    function addNotifiableAddresses(
        address[] memory _addresses
    ) public onlyOwner {
        for (uint i = 0; i < _addresses.length; i++) {
            notifiableAddresses.push(_addresses[i]);
        }
    }

    // Remove a notifiable address
    function removeNotifiableAddress(address _addr) public onlyOwner {
        for (uint i = 0; i < notifiableAddresses.length; i++) {
            if (notifiableAddresses[i] == _addr) {
                notifiableAddresses[i] = notifiableAddresses[
                    notifiableAddresses.length - 1
                ];
                notifiableAddresses.pop();
                break;
            }
        }
    }

    function getNotifiableAddresses()
        external
        view
        returns (address[] memory _addresses)
    {
        _addresses = notifiableAddresses;
    }

    function manualNotify(uint8 _index, uint8 _length) public onlyOwner {
        for (uint i = _index; i < _index + _length; i++) {
            if (i >= notifiableAddresses.length) break;
            IConfigNotifiable(notifiableAddresses[i]).configUpdated();
        }
    }

    function manualNotifyAddress(address _contract) public onlyOwner {
        IConfigNotifiable(_contract).configUpdated();
    }

    // Notify all registered addresses about a configuration update
    function notify() internal {
        for (uint i = 0; i < notifiableAddresses.length; i++) {
            IConfigNotifiable(notifiableAddresses[i]).configUpdated();
        }
    }
}
