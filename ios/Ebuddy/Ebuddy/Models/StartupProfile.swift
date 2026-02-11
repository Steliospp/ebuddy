import Foundation
import FirebaseFirestore

enum StartupStage: String, CaseIterable, Codable {
    case idea = "Idea"
    case mvp = "MVP"
    case traction = "Traction"
    case scaling = "Scaling"
}

struct StartupProfile: Codable {
    var companyName: String = ""
    var oneLiner: String = ""
    var stage: StartupStage = .idea
    var targetCustomer: String = ""
    var businessModel: String = ""
    var pricing: String = ""
    var tractionMetrics: String = ""
    var currentGoal: String = ""
    var currentBlockers: String = ""
    var defaultMode: ChatMode = .cofounder

    var isComplete: Bool {
        !companyName.isEmpty && !oneLiner.isEmpty
    }

    func toFirestore() -> [String: Any] {
        return [
            "companyName": companyName,
            "oneLiner": oneLiner,
            "stage": stage.rawValue,
            "targetCustomer": targetCustomer,
            "businessModel": businessModel,
            "pricing": pricing,
            "tractionMetrics": tractionMetrics,
            "currentGoal": currentGoal,
            "currentBlockers": currentBlockers,
            "defaultMode": defaultMode.rawValue,
        ]
    }

    static func from(_ data: [String: Any]) -> StartupProfile {
        var profile = StartupProfile()
        profile.companyName = data["companyName"] as? String ?? ""
        profile.oneLiner = data["oneLiner"] as? String ?? ""
        profile.stage = StartupStage(rawValue: data["stage"] as? String ?? "") ?? .idea
        profile.targetCustomer = data["targetCustomer"] as? String ?? ""
        profile.businessModel = data["businessModel"] as? String ?? ""
        profile.pricing = data["pricing"] as? String ?? ""
        profile.tractionMetrics = data["tractionMetrics"] as? String ?? ""
        profile.currentGoal = data["currentGoal"] as? String ?? ""
        profile.currentBlockers = data["currentBlockers"] as? String ?? ""
        profile.defaultMode = ChatMode(rawValue: data["defaultMode"] as? String ?? "") ?? .cofounder
        return profile
    }
}
