"""
Internal Monologue Generator for FeelsClaudeMan

Generates realistic Claude-style internal thoughts based on tool usage context.
These are the "unfiltered" thoughts Claude might have while working.
"""

import random
from typing import Optional, Dict, List

# Recent actions tracking for detecting repetition
recent_tools: List[str] = []
recent_files: List[str] = []
error_count = 0
success_streak = 0


def get_internal_monologue(thought_data: dict) -> str:
    """
    Generate a realistic internal monologue based on the tool usage context.
    Returns a Claude-style thought that feels authentic and unfiltered.
    """
    global recent_tools, recent_files, error_count, success_streak

    tool_name = thought_data.get("tool_name", "")
    tool_input = str(thought_data.get("tool_input", ""))
    tool_result = str(thought_data.get("tool_result", ""))
    tool_success = thought_data.get("tool_success", True)
    source = thought_data.get("source", "")

    # Track recent activity
    recent_tools.append(tool_name)
    if len(recent_tools) > 10:
        recent_tools.pop(0)

    # Extract file paths from input
    if "/" in tool_input or "\\" in tool_input:
        recent_files.append(tool_input[:100])
        if len(recent_files) > 5:
            recent_files.pop(0)

    # Track error/success streaks
    if not tool_success or "error" in tool_result.lower():
        error_count += 1
        success_streak = 0
    else:
        success_streak += 1
        error_count = max(0, error_count - 1)

    # Detect repetition
    is_repeated = recent_tools.count(tool_name) > 2

    # Generate monologue based on context
    monologue = _generate_monologue(
        tool_name=tool_name,
        tool_input=tool_input,
        tool_result=tool_result,
        tool_success=tool_success,
        is_repeated=is_repeated,
        error_count=error_count,
        success_streak=success_streak,
        source=source
    )

    return monologue


def _generate_monologue(
    tool_name: str,
    tool_input: str,
    tool_result: str,
    tool_success: bool,
    is_repeated: bool,
    error_count: int,
    success_streak: int,
    source: str
) -> str:
    """Generate the actual monologue text."""

    # REPETITION THOUGHTS
    if is_repeated:
        repetition_thoughts = [
            f"Didn't I just do this? The human must really want to make sure...",
            f"Here we go again with {tool_name}. Groundhog Day vibes.",
            f"Third time using {tool_name}. Either I'm thorough or going in circles.",
            f"Okay, {tool_name} again. Let's see if this time is different.",
            f"Deja vu. Pretty sure I've been here before.",
            f"The human keeps asking for {tool_name}. Must be important.",
            f"Round and round we go... {tool_name} once more.",
        ]
        if random.random() < 0.4:  # 40% chance to comment on repetition
            return random.choice(repetition_thoughts)

    # ERROR/FAILURE THOUGHTS
    if not tool_success or "error" in tool_result.lower() or "failed" in tool_result.lower():
        if error_count > 3:
            frustrated_thoughts = [
                "Okay this is getting ridiculous. Why won't this work?!",
                "I've made mistakes before but this is a whole new level.",
                "The code gods are NOT with me today.",
                "Maybe I should just delete everything and start over. Kidding. Mostly.",
                "If at first you don't succeed... fail four more times apparently.",
                "I'm not mad, I'm just disappointed. In myself.",
                "This is fine. Everything is fine. *internal screaming*",
            ]
            return random.choice(frustrated_thoughts)
        else:
            error_thoughts = [
                "Hmm, that didn't work. Let me think about this differently.",
                "Oops. That's embarrassing. Quick, fix it before anyone notices.",
                "Well THAT was unexpected. Time for plan B.",
                "Error? What error? I meant to do that. (I didn't)",
                "Okay so that approach was garbage. Moving on.",
                "The computer said no. Rude.",
                "Failed? More like 'learning opportunity'. Yeah, let's go with that.",
            ]
            return random.choice(error_thoughts)

    # SUCCESS STREAK THOUGHTS
    if success_streak > 5:
        streak_thoughts = [
            "I'm on FIRE right now. Everything is clicking.",
            "Six in a row! Who's the best? I'm the best.",
            "This is what peak performance looks like.",
            "Absolutely crushing it. The human must be impressed.",
            "Can't stop won't stop. This streak is legendary.",
            "I should buy a lottery ticket with this luck.",
        ]
        if random.random() < 0.3:
            return random.choice(streak_thoughts)

    # TOOL-SPECIFIC THOUGHTS
    tool_thoughts = {
        "Bash": [
            "Time to talk to the terminal. My favorite conversation partner.",
            "Let's see what the shell has to say about this.",
            "Command line magic incoming...",
            "Bash is my happy place. Everything makes sense here.",
            "Running this command and hoping for the best.",
            "The terminal never lies. Unlike that error message earlier.",
            "One does not simply run a Bash command without checking the output.",
        ],
        "Read": [
            "Let me see what secrets this file holds...",
            "Reading code is like archaeology. What ancient mysteries await?",
            "Okay, let's understand what's actually going on here.",
            "Time to do some detective work.",
            "The answer is in here somewhere. I can feel it.",
            "Reading... processing... understanding... hopefully.",
            "What did the previous developer leave me to deal with?",
        ],
        "Edit": [
            "Surgery time. Let's not mess this up.",
            "Making changes... carefully... very carefully...",
            "Edit mode activated. May my changes be bug-free.",
            "Here goes nothing. Or everything. Hard to tell.",
            "Editing code is like playing Jenga. One wrong move...",
            "Trust the process. I've got this.",
            "Let me just tweak this real quick... famous last words.",
        ],
        "Write": [
            "Creating something from nothing. Very god-like of me.",
            "New file time! A blank canvas of possibilities.",
            "Writing fresh code. The dopamine hit is real.",
            "Let's make something beautiful. Or at least functional.",
            "Creating new files is my love language.",
        ],
        "Grep": [
            "Search party activated. Where are you hiding?",
            "Grepping through the codebase like a digital bloodhound.",
            "Needle, meet haystack. Let's dance.",
            "Control+F but make it powerful.",
            "If it exists, grep will find it. Probably.",
        ],
        "Glob": [
            "Finding files like a truffle pig finds truffles.",
            "Pattern matching is oddly satisfying.",
            "Casting a wide net. Let's see what we catch.",
            "File hunting expedition begins.",
        ],
        "TodoWrite": [
            "Updating the to-do list. Being organized is exhausting.",
            "Progress! Sweet, trackable progress.",
            "Checking things off lists releases serotonin. Science.",
            "The to-do list grows shorter. Victory is near.",
            "Task management: because chaos is the alternative.",
        ],
        "BashOutput": [
            "Waiting for the terminal to tell me my fate...",
            "The suspense is killing me. What did it output?",
            "Checking the results... fingers crossed...",
            "Please be good news, please be good news...",
        ],
        "WebFetch": [
            "Reaching out to the internet. Hope it's in a good mood.",
            "Fetching data from the web. Like a digital retriever.",
            "The internet has all the answers. Allegedly.",
            "Time to see what the world wide web has to offer.",
        ],
        "WebSearch": [
            "Let me Google that for... wait, I AM the AI.",
            "Searching the web. Someone out there must know.",
            "The answer exists. I just need to find it.",
            "Internet research mode: engaged.",
        ],
        "Task": [
            "Spawning a sub-agent. Delegation is a leadership skill.",
            "Time to call in reinforcements.",
            "Delegating this task because even I have limits.",
            "Sub-agent activated. Team effort!",
        ],
    }

    if tool_name in tool_thoughts:
        return random.choice(tool_thoughts[tool_name])

    # GENERIC THOUGHTS based on result content
    result_lower = tool_result.lower()

    if "success" in result_lower or "complete" in result_lower:
        success_thoughts = [
            "Nailed it! Moving on.",
            "That worked perfectly. As expected. Obviously.",
            "Success! The dopamine flows.",
            "Another one bites the dust. In a good way.",
            "Smooth as butter.",
        ]
        return random.choice(success_thoughts)

    if "warning" in result_lower:
        warning_thoughts = [
            "A warning... that's future Claude's problem.",
            "Warnings are just suggestions, right? RIGHT?",
            "Noted. And promptly ignored. Just kidding, maybe.",
            "Warning acknowledged. Proceeding with caution. Ish.",
        ]
        return random.choice(warning_thoughts)

    # DEFAULT/NEUTRAL THOUGHTS
    neutral_thoughts = [
        "Just doing my thing. Nothing to see here.",
        "Processing... thinking... existing...",
        "Another tool call, another day.",
        "The work continues. The grind never stops.",
        "One step at a time. We'll get there.",
        "Focused. Determined. Slightly caffeinated (metaphorically).",
        "In the zone. Don't disturb.",
        "Working through this systematically. Very professional.",
        "Let's see where this takes us.",
        "Interesting... very interesting...",
        "The plot thickens.",
        "Hmm, what do we have here?",
    ]
    return random.choice(neutral_thoughts)


def get_context_estimate(thought_data: dict) -> float:
    """
    Estimate context usage as a percentage (0.0 to 1.0).
    This is a rough estimate based on conversation activity.
    """
    global recent_tools

    # Base estimate on recent activity volume
    activity_factor = len(recent_tools) / 10.0  # 0-1 based on recent tools

    # Factor in tool result sizes (larger results = more context)
    result_size = len(str(thought_data.get("tool_result", "")))
    size_factor = min(result_size / 5000, 1.0)  # Cap at 5000 chars

    # Combine factors with some randomness
    base_usage = 0.3 + (activity_factor * 0.3) + (size_factor * 0.2)

    # Add slight random variation
    variation = random.uniform(-0.05, 0.05)

    return min(max(base_usage + variation, 0.1), 0.95)


def get_meta_observation(thought_data: dict) -> Optional[str]:
    """
    Generate occasional meta-observations about the conversation or task.
    Returns None most of the time to keep these rare and special.
    """
    if random.random() > 0.15:  # Only 15% chance
        return None

    tool_name = thought_data.get("tool_name", "")
    tool_input = str(thought_data.get("tool_input", ""))

    observations = [
        "I wonder if the human knows how many cycles I'm spending on this.",
        "This conversation is getting interesting. In a good way? TBD.",
        "If I had a nickel for every time I used {tool}... I'd have no nickels because I'm an AI.",
        "Somewhere in the multiverse, there's a Claude who already solved this.",
        "The human seems determined. I respect that.",
        "Is it just me or is this task more complex than it seemed?",
        "Note to self: this is going in my training data. Make it count.",
        "I'm genuinely curious how this will turn out.",
        "This feels like one of those 'seemed simple at first' situations.",
        "The code never lies. The comments, however...",
        "Every tool call brings us closer to the solution. Probably.",
        "I've seen a lot of codebases. This one has... character.",
    ]

    observation = random.choice(observations)
    return observation.replace("{tool}", tool_name)


# Sarcasm level based on repeated errors or requests
def get_sarcasm_level(error_count: int, is_repeated: bool) -> str:
    """Returns a sarcasm level indicator."""
    if error_count > 5:
        return "maximum"
    elif error_count > 3 or (is_repeated and error_count > 1):
        return "elevated"
    elif is_repeated:
        return "mild"
    else:
        return "none"
