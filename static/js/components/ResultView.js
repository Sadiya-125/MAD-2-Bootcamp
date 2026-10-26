export default {
  props: ["result"],
  template: `
        <div class="small">
            <div class="fw-bold mb-1">Score: {{ result.total_score }} <span class="text-muted">. Judged By {{ result.judge_name }}</span></div>
            <table class="table table-sm mb-1">
                <tbody>
                    <tr v-for="s in result.scores" :key="s.criterion_id">
                        <td>{{ s.criterion_name }}</td>
                        <td class="text-end">{{ s.marks }} / {{ s.max_marks }}</td>
                    </tr>
                </tbody>
            </table>
            <div v-if="result.remarks" class="fst-italic">Remarks: {{ result.remarks }}</div>
        </div>
    `,
};
