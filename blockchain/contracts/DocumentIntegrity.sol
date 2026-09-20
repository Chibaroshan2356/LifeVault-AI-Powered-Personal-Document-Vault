// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * DocumentIntegrity.sol — LifeVault Document Hash Registry
 *
 * Purpose:
 *   Provides an immutable, tamper-proof registry that maps a LifeVault
 *   document ID to the SHA-256 hash of its file bytes at the time of upload.
 *
 * Privacy guarantee:
 *   - NO personal data (name, DOB, document number, etc.) is stored here.
 *   - ONLY the SHA-256 hash (bytes32) and the internal document ID go on-chain.
 *   - Document IDs are MongoDB ObjectId strings — they carry no PII.
 *
 * Usage:
 *   register(documentId, fileHash)  — called by backend after upload (once per document)
 *   verify(documentId, fileHash)    — called by backend on user "Verify Integrity" click
 *   getRecord(documentId)           — called by backend to display chain metadata
 */
contract DocumentIntegrity {

    // ----------------------------------------------------------------
    // Data structures
    // ----------------------------------------------------------------

    struct DocumentRecord {
        bytes32 fileHash;        // SHA-256 of raw file bytes (hex → bytes32)
        address registeredBy;   // backend wallet that called register()
        uint256 timestamp;      // block.timestamp at registration (Unix seconds)
        bool    exists;         // guard: prevents double-registration
    }

    // documentId (MongoDB ObjectId string) → immutable record
    mapping(string => DocumentRecord) private _records;

    // ----------------------------------------------------------------
    // Events
    // ----------------------------------------------------------------

    /**
     * Emitted on every successful registration.
     * Indexed fields allow efficient log filtering by documentId or registrar.
     */
    event DocumentRegistered(
        string  indexed documentId,
        bytes32         fileHash,
        address indexed registeredBy,
        uint256         timestamp
    );

    // ----------------------------------------------------------------
    // Write functions
    // ----------------------------------------------------------------

    /**
     * @notice Register a document's SHA-256 hash on-chain.
     * @dev    Can only be called ONCE per documentId — subsequent calls revert.
     *         This enforces immutability: once registered, the hash cannot change.
     *
     * @param documentId  MongoDB ObjectId string (no PII)
     * @param fileHash    keccak/SHA-256 of file bytes, encoded as bytes32
     */
    function register(string calldata documentId, bytes32 fileHash) external {
        require(bytes(documentId).length > 0, "DocumentIntegrity: empty documentId");
        require(fileHash != bytes32(0), "DocumentIntegrity: empty fileHash");
        require(!_records[documentId].exists, "DocumentIntegrity: already registered");

        _records[documentId] = DocumentRecord({
            fileHash:     fileHash,
            registeredBy: msg.sender,
            timestamp:    block.timestamp,
            exists:       true
        });

        emit DocumentRegistered(documentId, fileHash, msg.sender, block.timestamp);
    }

    // ----------------------------------------------------------------
    // Read functions (view — free, no gas required)
    // ----------------------------------------------------------------

    /**
     * @notice Verify whether a given hash matches the on-chain record.
     * @dev    Pure view call — no transaction, no gas cost for caller.
     *
     * @param documentId  MongoDB ObjectId string
     * @param fileHash    Hash to compare against on-chain record
     * @return verified   true if the supplied hash matches the registered hash
     * @return timestamp  Unix timestamp of registration (0 if not registered)
     */
    function verify(
        string calldata documentId,
        bytes32 fileHash
    ) external view returns (bool verified, uint256 timestamp) {
        DocumentRecord storage rec = _records[documentId];
        if (!rec.exists) {
            return (false, 0);
        }
        return (rec.fileHash == fileHash, rec.timestamp);
    }

    /**
     * @notice Retrieve the full on-chain record for a document.
     * @dev    Used by the backend to populate the "Blockchain Integrity" panel.
     *
     * @param documentId  MongoDB ObjectId string
     * @return fileHash      The registered SHA-256 hash (bytes32(0) if not found)
     * @return registeredBy  Wallet address of the registrar
     * @return timestamp     Unix registration timestamp
     * @return exists        Whether a record exists for this documentId
     */
    function getRecord(string calldata documentId)
        external
        view
        returns (
            bytes32 fileHash,
            address registeredBy,
            uint256 timestamp,
            bool    exists
        )
    {
        DocumentRecord storage rec = _records[documentId];
        return (rec.fileHash, rec.registeredBy, rec.timestamp, rec.exists);
    }
}
