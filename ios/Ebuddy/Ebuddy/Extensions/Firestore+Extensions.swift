import Foundation
import FirebaseFirestore

// Make Timestamp conform to DateValue protocol used in Quote model
extension Timestamp: DateValue {}

extension DocumentReference {
    /// Convenience: same as document()
    func doc(_ path: String) -> DocumentReference {
        return self.collection(path).document()
    }
}

extension CollectionReference {
    /// Convenience alias
    func doc(_ documentPath: String) -> DocumentReference {
        return self.document(documentPath)
    }
}
